import { CAMPUS_TIME_ZONE } from "./schedule";
import type { ClassSession, Weekday } from "./types";

const ICS_DAY: Record<Weekday, string> = {
  sun: "SU",
  mon: "MO",
  tue: "TU",
  wed: "WE",
  thu: "TH",
  fri: "FR",
  sat: "SA",
};

const DAY_OFFSET: Record<Weekday, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const CAMPUS_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

/** Today's campus calendar date plus its weekday, as a UTC-anchored Date. */
function campusToday(now: Date): { date: Date; weekday: Weekday } {
  const parts = CAMPUS_DATE.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const date = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`);
  const short = get("weekday").toLowerCase() as Weekday;
  return { date, weekday: short in ICS_DAY ? short : "mon" };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local (floating) ICS timestamp, e.g. 20260817T083000. */
function stamp(date: Date, hhmm: string): string {
  const [h = "0", m = "0"] = hhmm.split(":");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(Number(h))}${pad(Number(m))}00`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** RFC 5545 requires lines of at most 75 octets. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = rest.slice(73);
  }
  chunks.push(rest);
  return chunks.join("\r\n ");
}

/**
 * A weekly-repeating calendar for the selected timetable. Times are written as
 * floating local times so they read correctly on a device set to campus time.
 */
export function buildTimetableIcs(input: {
  sessions: ClassSession[];
  now: Date;
  calendarName: string;
  /** How many weeks the recurrence runs for. */
  weeks?: number;
}): string {
  const { sessions, now, calendarName, weeks = 16 } = input;
  const today = campusToday(now);
  const dtstamp = `${now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FSM Timetable Fall 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${CAMPUS_TIME_ZONE}`,
  ];

  for (const session of sessions) {
    const delta = (DAY_OFFSET[session.day] - DAY_OFFSET[today.weekday] + 7) % 7;
    const first = new Date(today.date.getTime() + delta * 86_400_000);
    const description = [
      session.courseCode ? `Course: ${session.courseCode}` : "",
      session.teacher ? `Instructor: ${session.teacher}` : "",
      session.isRepeat ? "Repeat course" : "",
      `Section: ${session.sectionId}`,
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${session.id}@fsm-timetable`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(first, session.start)}`,
      `DTEND:${stamp(first, session.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAY[session.day]};COUNT=${weeks}`,
      `SUMMARY:${escapeText(session.courseTitle)}`,
      ...(session.room ? [`LOCATION:${escapeText(session.room)}`] : []),
      `DESCRIPTION:${escapeText(description)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n");
}
