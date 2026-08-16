import type { ClassSession, Timetable, Weekday } from "./types";

const DAY_INDEX: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Campus timezone. All schedule logic is evaluated in Karachi wall-clock time. */
export const CAMPUS_TIME_ZONE = "Asia/Karachi";

const CAMPUS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const WEEKDAY_BY_SHORT: Record<string, Weekday> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

/** The given instant expressed as Karachi weekday + minutes since midnight. */
export function campusParts(date: Date): { day: Weekday; minutes: number } {
  const parts = CAMPUS_FORMAT.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = WEEKDAY_BY_SHORT[get("weekday")] ?? DAY_INDEX[date.getDay()]!;
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { day, minutes: hour * 60 + minute };
}

export function campusMinutes(date: Date): number {
  return campusParts(date).minutes;
}

export function weekdayOf(date: Date): Weekday {
  return campusParts(date).day;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function getDaySessions(
  timetable: Timetable,
  sectionId: string,
  day: Weekday,
): ClassSession[] {
  return timetable.sessions
    .filter((s) => s.sectionId === sectionId && s.day === day)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export function getCurrentSession(sessions: ClassSession[], now: Date): ClassSession | null {
  const minutes = campusMinutes(now);
  return sessions.find((s) => minutes >= toMinutes(s.start) && minutes < toMinutes(s.end)) ?? null;
}

export function getNextSession(sessions: ClassSession[], now: Date): ClassSession | null {
  const minutes = campusMinutes(now);
  return sessions.find((s) => toMinutes(s.start) > minutes) ?? null;
}

/** "34 min", "1 hr 20 min", "2 hr" — used for live "Ends in / Starts in" countdowns. */
export function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 1) return "less than a minute";
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** "1h 20m", "45m" — quiet, compact class-length metadata (not a countdown). */
export function formatClassDuration(start: string, end: string): string {
  const minutes = Math.max(0, toMinutes(end) - toMinutes(start));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Elapsed fraction (0–1) of a session at the given instant, clamped. Used for the live progress bar. */
export function getSessionProgress(session: { start: string; end: string }, now: Date): number {
  const minutes = campusMinutes(now);
  const start = toMinutes(session.start);
  const end = toMinutes(session.end);
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (minutes - start) / (end - start)));
}

export function minutesUntil(hhmm: string, now: Date): number {
  return toMinutes(hhmm) - campusMinutes(now);
}

export function formatRelativeUpdated(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatDayHeading(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      timeZone: CAMPUS_TIME_ZONE,
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}
