import type { Weekday } from "../types";

/** Canonical, student-facing programs. */
export const PROGRAMS = ["BBA", "FinTech", "BSBA", "A&F"] as const;
export type CanonicalProgram = (typeof PROGRAMS)[number];

/** Source section-code prefix -> canonical program. BA and BSBA are the same program. */
const PROGRAM_BY_PREFIX: Record<string, CanonicalProgram> = {
  BBA: "BBA",
  FT: "FinTech",
  BSBA: "BSBA",
  BA: "BSBA",
  AF: "A&F",
};

/** Prefix used when building a section id for a canonical program. */
const PREFIX_BY_PROGRAM: Record<CanonicalProgram, string> = {
  BBA: "BBA",
  FinTech: "FT",
  BSBA: "BSBA",
  "A&F": "AF",
};

export const SEMESTER_BY_BATCH: Record<string, string> = {
  "26": "01",
  "25": "03",
  "24": "05",
  "23": "07",
};

export const BATCH_BY_SEMESTER: Record<string, string> = {
  "01": "26",
  "03": "25",
  "05": "24",
  "07": "23",
};

export const STUDENT_SECTIONS = ["A", "B", "C", "D"] as const;
export type StudentSection = (typeof STUDENT_SECTIONS)[number];

export type ParsedSectionCode = {
  /**
   * Student-facing section id, e.g. "BBA01A" for a normal section and
   * "BBA3A" for a repeat-course offering. Never includes a subgroup.
   * Zero-padded ids (BBA03A) and unpadded ids (BBA3A) are deliberately
   * different identifiers and are never merged.
   */
  sectionId: string;
  /** Raw source token, e.g. "BBA01A1". */
  raw: string;
  program: CanonicalProgram;
  /** Canonical zero-padded semester, e.g. "03". */
  semester: string;
  section: StudentSection;
  /**
   * true when the source wrote an unpadded semester (BBA3A). Those are
   * repeat-course offerings and must never enter a regular timetable.
   */
  isRepeat: boolean;
  /** Internal lab/course subgroup such as "1" in BBA01A1 — never student-facing. */
  subgroup?: string;
  batch?: string;
};

const SECTION_RE = /^([A-Z]{2,4})\s*[- ]?\s*(\d{1,2})\s*([A-D])\s*(\d)?$/;

/**
 * Parses one or more section tokens from a timetable cell such as
 * "BBA01A", "BSBA01D1" or "FT07A/B". Returns [] when the cell is not a
 * section code (the caller then treats it as unresolved, never as a guess).
 */
export function parseSectionCell(value: string): ParsedSectionCode[] {
  const cleaned = value.replace(/\s+/g, " ").trim().toUpperCase();
  if (!cleaned) return [];
  const parts = cleaned.split("/").map((part) => part.trim());
  const first = parts[0] ?? "";
  const head = SECTION_RE.exec(first);
  if (!head) return [];

  const prefix = head[1]!;
  const rawSemester = head[2]!;
  const isRepeat = rawSemester.length === 1;
  const semester = rawSemester.padStart(2, "0");
  const program = PROGRAM_BY_PREFIX[prefix];
  if (!program) return [];

  const results: ParsedSectionCode[] = [];
  for (const part of parts) {
    // "FT07A/B" — trailing parts carry only the section letter.
    const match = SECTION_RE.exec(part) ?? /^([A-D])\s*(\d)?$/.exec(part);
    if (!match) continue;
    const section = (match.length === 5 ? match[3] : match[1]) as StudentSection | undefined;
    const subgroup = match.length === 5 ? match[4] : match[2];
    if (!section) continue;
    results.push({
      // Canonical prefix so the Course Plan's "BA01A" and the grid's
      // "BSBA01A" resolve to the same section. Semester padding is kept
      // verbatim: BBA03A and BBA3A stay distinct identifiers.
      sectionId: `${PREFIX_BY_PROGRAM[program]}${rawSemester}${section}`,
      raw: part,
      program,
      semester,
      section,
      isRepeat,
      ...(subgroup ? { subgroup } : {}),
      ...(BATCH_BY_SEMESTER[semester] ? { batch: BATCH_BY_SEMESTER[semester]! } : {}),
    });
  }
  return results;
}

/** Deterministic batch + program + section -> source section id. */
export function sectionIdFor(
  batchId: string | null,
  program: CanonicalProgram | null,
  section: string | null,
): string | null {
  if (!batchId || !program || !section) return null;
  const semester = SEMESTER_BY_BATCH[batchId];
  if (!semester) return null;
  return `${PREFIX_BY_PROGRAM[program]}${semester}${section}`;
}

/** "AF 3001", "\tCY 4053" and "AF3001" all normalize to "AF3001". */
export function normalizeCourseCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export const DAY_BY_LABEL: Record<string, Weekday> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};
