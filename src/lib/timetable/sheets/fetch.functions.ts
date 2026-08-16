import { createServerFn } from "@tanstack/react-start";
import { buildTimetable } from "./build";
import type { RepeatOffering } from "./build";
import { validateBuild } from "./validate";
import { getGoogleSheetsAccessToken } from "./google-auth";
import type { Timetable } from "../types";

const SPREADSHEET_ID = "1AnFQQhv9lu4grESE2ypbDG7E1QOPGgGCRiejem5ocPw";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4";
const TIMETABLE_RANGE = "Timetable!A1:BH200";
const COURSE_PLAN_RANGE = "Course%20Plan%20!A1:Z400";
const ELECTIVES_RANGE = "Electives!A1:Z200";

// Bounded timeout plus one retry so a slow/failed first attempt on a cold
// serverless instance doesn't silently eat the whole request budget.
const REQUEST_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 300;

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      lastError = error;
      console.error("[sheets-read] fetch-attempt-failed", {
        url: input,
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Network request failed.");
}

export type SheetsTimetablePayload = {
  timetable: Timetable;
  repeatOfferings: RepeatOffering[];
  validation: {
    ok: boolean;
    errorCount: number;
    warningCount: number;
    stats: ReturnType<typeof validateBuild>["stats"];
  };
};

export const loadSheetsTimetable = createServerFn({ method: "GET" }).handler(
  async (): Promise<SheetsTimetablePayload> => {
    try {
      const accessToken = await getGoogleSheetsAccessToken();

      async function readRange(range: string): Promise<string[][]> {
        const response = await fetchWithRetry(
          `${SHEETS_API_URL}/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (!response.ok) {
          const body = await response.text();
          console.error(`Sheets read failed [${response.status}]: ${body}`);
          throw new Error(`Timetable source request failed [${response.status}]`);
        }
        const json = (await response.json()) as { values?: string[][] };
        return json.values ?? [];
      }

      const [timetableValues, coursePlanValues, electivesValues] = await Promise.all([
        readRange(TIMETABLE_RANGE),
        readRange(COURSE_PLAN_RANGE),
        readRange(ELECTIVES_RANGE),
      ]);

      const build = buildTimetable(
        timetableValues,
        coursePlanValues,
        new Date().toISOString(),
        electivesValues,
      );
      const report = validateBuild(build);
      if (!report.ok) {
        console.error("Timetable validation failed", report.errors.slice(0, 20));
        throw new Error(
          `Timetable data failed validation with ${report.errors.length} error(s); refusing to serve it.`,
        );
      }
      if (report.warnings.length > 0) {
        console.warn(
          `Timetable diagnostics: ${report.warnings.length} unresolved/ambiguous entries`,
        );
      }

      return {
        timetable: build.timetable,
        repeatOfferings: build.repeatOfferings,
        validation: {
          ok: report.ok,
          errorCount: report.errors.length,
          warningCount: report.warnings.length,
          stats: report.stats,
        },
      };
    } catch (error) {
      // Normalize any thrown value (including non-Error throws from a
      // runtime-level failure) into a well-formed Error so the app's
      // existing error boundary always has a clean message to render,
      // instead of risking an unexpected throw type reaching the SSR layer.
      console.error("[sheets] loadSheetsTimetable failed", error);
      if (error instanceof Error) throw error;
      throw new Error("Timetable source request failed.");
    }
  },
);
