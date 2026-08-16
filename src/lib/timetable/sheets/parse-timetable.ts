import type { Weekday } from "../types";
import { DAY_BY_LABEL, normalizeCourseCode, parseSectionCell } from "./normalize";
import type { ParsedSectionCode } from "./normalize";

/** Column index -> default slot time, taken from the sheet's own slot headers. */
const SLOT_COLUMNS: { column: number; start: string; end: string }[] = [
  { column: 3, start: "08:30", end: "09:50" },
  { column: 12, start: "10:00", end: "11:20" },
  { column: 21, start: "11:30", end: "12:50" },
  { column: 30, start: "13:00", end: "14:20" },
  { column: 39, start: "14:25", end: "15:45" },
  { column: 48, start: "15:50", end: "17:10" },
];

const NON_CLASS_PATTERNS = [
  /jumm?a/i,
  /prayer/i,
  /namaz/i,
  /seminar/i,
  /break/i,
  /meeting/i,
  /orientation/i,
  /holiday/i,
  /event/i,
  /reserved/i,
];

export type ParsedEntry = {
  courseTitle: string;
  courseCode?: string;
  room: string;
  day: Weekday;
  start: string;
  end: string;
  /** Explicit in-cell time won over the column slot. */
  explicitTime: boolean;
  sections: ParsedSectionCode[];
  area: "classes" | "labs";
  sourceRow: number;
  sourceColumn: number;
  raw: string;
};

export type NonClassEntry = {
  label: string;
  room: string;
  day: Weekday;
  start: string;
  end: string;
  sourceRow: number;
};

export type UnresolvedEntry = {
  raw: string;
  reason: string;
  room: string;
  day?: Weekday;
  sourceRow: number;
  sourceColumn: number;
};

export type TimetableParseResult = {
  entries: ParsedEntry[];
  nonClassEntries: NonClassEntry[];
  unresolved: UnresolvedEntry[];
};

function slotForColumn(column: number) {
  let slot = SLOT_COLUMNS[0]!;
  for (const candidate of SLOT_COLUMNS) if (column >= candidate.column) slot = candidate;
  return slot;
}

function pad(value: string): string {
  const [h, m] = value.split(/[:.]/);
  return `${String(Number(h)).padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

/** Sheet times are written in a 12h-ish style without a meridiem: 01:00 means 13:00. */
function toTwentyFour(value: string): string {
  const [h, m] = pad(value).split(":");
  const hour = Number(h);
  return `${String(hour >= 1 && hour <= 7 ? hour + 12 : hour).padStart(2, "0")}:${m}`;
}

const TIME_IN_TEXT = /\(\s*(\d{1,2}[:.]\d{2})\s*[-–to]+\s*(\d{1,2}[:.]\d{2})\s*\)\s*$/;

/** Tolerant course-code extraction: "AF 3001Financial Mgmt", "\tCY 4053Cyber..." */
const COURSE_CODE_RE = /^\s*([A-Za-z]{2,3})\s*[- ]?\s*(\d{4})\s*[-:]?\s*/;

export function parseCourseCell(rawValue: string): {
  courseTitle: string;
  courseCode?: string;
  start?: string;
  end?: string;
} {
  const raw = rawValue.replace(/\s+/g, " ").trim();
  let text = raw;
  let start: string | undefined;
  let end: string | undefined;

  const time = TIME_IN_TEXT.exec(text);
  if (time) {
    start = toTwentyFour(time[1]!);
    end = toTwentyFour(time[2]!);
    text = text.slice(0, time.index).trim();
  }

  const times = start && end ? { start, end } : {};

  const code = COURSE_CODE_RE.exec(text);
  if (!code) return { courseTitle: text, ...times };

  const courseCode = normalizeCourseCode(`${code[1]}${code[2]}`);
  const courseTitle = text.slice(code[0].length).trim() || text.trim();
  return { courseTitle, courseCode, ...times };
}

function isNonClass(text: string): boolean {
  return NON_CLASS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Walks the room/time grid. Merged cells arrive once (only the anchor cell has
 * a value), so each merged block yields exactly one entry.
 */
export function parseTimetableGrid(values: string[][]): TimetableParseResult {
  const entries: ParsedEntry[] = [];
  const nonClassEntries: NonClassEntry[] = [];
  const unresolved: UnresolvedEntry[] = [];

  let day: Weekday | null = null;
  let area: "classes" | "labs" = "classes";

  values.forEach((row, rowIndex) => {
    const dayLabel = (row[0] ?? "").trim().toLowerCase();
    if (DAY_BY_LABEL[dayLabel]) day = DAY_BY_LABEL[dayLabel]!;
    const areaLabel = (row[1] ?? "").trim().toLowerCase();
    if (areaLabel === "classes") area = "classes";
    if (areaLabel === "labs") area = "labs";

    const room = (row[2] ?? "").replace(/\s+/g, " ").trim();
    if (!day || !room || room.toLowerCase() === "room") return;

    let pending: ParsedEntry | null = null;
    const flush = () => {
      if (!pending) return;
      if (pending.sections.length === 0) {
        unresolved.push({
          raw: pending.raw,
          reason: "course cell without a section code",
          room: pending.room,
          day: pending.day,
          sourceRow: pending.sourceRow,
          sourceColumn: pending.sourceColumn,
        });
      } else {
        entries.push(pending);
      }
      pending = null;
    };

    for (let column = 3; column < row.length; column += 1) {
      const cell = (row[column] ?? "").trim();
      if (!cell) continue;

      const sections = parseSectionCell(cell);
      if (sections.length > 0) {
        if (pending) {
          pending.sections.push(...sections);
          flush();
        } else {
          unresolved.push({
            raw: cell,
            reason: "section code without a preceding course cell",
            room,
            day,
            sourceRow: rowIndex,
            sourceColumn: column,
          });
        }
        continue;
      }

      flush();
      const slot = slotForColumn(column);
      const parsed = parseCourseCell(cell);

      if (isNonClass(parsed.courseTitle) || isNonClass(cell)) {
        nonClassEntries.push({
          label: parsed.courseTitle || cell,
          room,
          day,
          start: parsed.start ?? slot.start,
          end: parsed.end ?? slot.end,
          sourceRow: rowIndex,
        });
        continue;
      }

      // Short opaque tokens ("MS", "CS") are never guessed at.
      if (!parsed.courseCode && parsed.courseTitle.replace(/[^A-Za-z]/g, "").length <= 3) {
        unresolved.push({
          raw: cell,
          reason: "unknown short token",
          room,
          day,
          sourceRow: rowIndex,
          sourceColumn: column,
        });
        continue;
      }

      pending = {
        courseTitle: parsed.courseTitle,
        ...(parsed.courseCode ? { courseCode: parsed.courseCode } : {}),
        room,
        day,
        start: parsed.start ?? slot.start,
        end: parsed.end ?? slot.end,
        explicitTime: Boolean(parsed.start),
        sections: [],
        area,
        sourceRow: rowIndex,
        sourceColumn: column,
        raw: cell,
      };
    }

    flush();
  });

  return { entries, nonClassEntries, unresolved };
}
