/**
 * Minimal Google service-account OAuth2 client for server-only use.
 *
 * Deliberately implemented with only Web Crypto (`crypto.subtle`) and `fetch`,
 * both of which are available on every runtime this app ships to (Cloudflare
 * Workers on Lovable, Node on Vercel) without adding a Node-specific auth
 * dependency that could break on one of them.
 *
 * This module must never be imported from client code. It is only ever used
 * from `fetch.functions.ts`, which runs inside a TanStack Start server
 * function and is stripped from the client bundle.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

// Refresh a little before actual expiry to avoid edge-of-expiry request failures.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

// Outbound calls get a bounded timeout plus one retry so a slow/failed first
// attempt on a cold serverless instance doesn't silently eat the whole
// request budget or surface as an opaque crash.
const REQUEST_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 300;

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

function currentRuntimeLabel(): string {
  const nodeVersion = (globalThis as { process?: { versions?: { node?: string } } }).process
    ?.versions?.node;
  return nodeVersion ? `node ${nodeVersion}` : "workerd";
}

/** Logs a safe, non-secret breadcrumb: stage name only, never key material. */
function logStage(stage: string, detail?: Record<string, unknown>) {
  console.error(`[sheets-auth] ${stage}`, { runtime: currentRuntimeLabel(), ...detail });
}

/**
 * Resolves a WebCrypto implementation across runtimes. `globalThis.crypto`
 * covers Cloudflare Workers and current Node LTS versions; the dynamic
 * `node:crypto` import is a fallback for older Node runtimes that don't
 * expose it globally. The import is only reached if `globalThis.crypto` is
 * already missing, so it never executes (and never affects the Cloudflare
 * build) on Lovable.
 */
async function resolveWebCrypto(): Promise<Crypto> {
  const existing = (globalThis as { crypto?: Crypto }).crypto;
  if (existing?.subtle) return existing;
  try {
    const nodeCrypto = (await import("node:crypto")) as unknown as { webcrypto?: Crypto };
    if (nodeCrypto.webcrypto?.subtle) return nodeCrypto.webcrypto;
  } catch {
    // fall through to the error below
  }
  throw new Error("Web Crypto API is not available in this runtime.");
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const contents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(contents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Normalizes the handful of ways a PEM key tends to arrive intact after
 * being pasted into an env-var dashboard: literal `\n` escapes instead of
 * real newlines, and stray wrapping quotes left over from copying the raw
 * JSON string value (including its quote characters) out of the downloaded
 * service-account key file.
 */
function normalizePrivateKey(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  if (value.includes("\\n")) {
    value = value.replace(/\\n/g, "\n");
  }
  return value;
}

function readServiceAccountCredentials(): { email: string; privateKey: string } {
  const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"]?.trim();
  const rawKey = process.env["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"];
  logStage("env-check", {
    hasEmail: Boolean(email),
    hasPrivateKey: Boolean(rawKey),
  });
  if (!email || !rawKey) {
    throw new Error("Google Sheets connection is not configured for this environment.");
  }
  return { email, privateKey: normalizePrivateKey(rawKey) };
}

async function signJwtAssertion(email: string, privateKeyPem: string): Promise<string> {
  const webCrypto = await resolveWebCrypto();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: SHEETS_READONLY_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const signingInput = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(
    JSON.stringify(claims),
  )}`;

  const cryptoKey = await webCrypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await webCrypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** fetch with a bounded timeout and a single retry, for cold-start resilience. */
async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      lastError = error;
      logStage("fetch-attempt-failed", {
        url: input,
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Network request failed.");
}

/**
 * Returns a valid access token for a read-only Google Sheets service-account
 * session, reusing a cached token within a warm server instance where
 * possible.
 */
export async function getGoogleSheetsAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + EXPIRY_SAFETY_MARGIN_MS) {
    return cachedToken.accessToken;
  }

  const { email, privateKey } = readServiceAccountCredentials();
  logStage("jwt-sign:start");
  const assertion = await signJwtAssertion(email, privateKey);
  logStage("jwt-sign:ok");

  logStage("token-exchange:start");
  const response = await fetchWithRetry(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Google OAuth token request failed [${response.status}]: ${body}`);
    throw new Error(`Timetable source authentication failed [${response.status}]`);
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("Timetable source authentication failed: no access token returned.");
  }
  logStage("token-exchange:ok");

  cachedToken = {
    accessToken: json.access_token,
    expiresAtMs: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}
