import { normalizeCourseCode } from "./normalize";

export type ElectiveRecord = {
  courseCode: string;
  courseTitle: string;
  instructor?: string;
};

export type ElectiveParseResult = {
  /** Course code -> record, only for codes with a single unambiguous entry. */
  byCode: Map<string, ElectiveRecord>;
  /** Codes that appear more than once with conflicting title/faculty. */
  ambiguous: string[];
};

const COURSE_CODE_CELL = /^[A-Za-z]{2,3}\s*-?\s*\d{4}$/;

/**
 * The Electives tab lists cross-listed elective offerings:
 * [Sr#, Course Code, Title, Offered to, Stream, Timings, Faculty Name, ...].
 * It is a *secondary* join source, used only for course codes the Course Plan
 * does not list for a section (7th-semester electives live here, not there).
 * A code is only usable when every row for it agrees on title and faculty —
 * conflicts stay unresolved rather than being guessed.
 */
export function parseElectives(values: string[][]): ElectiveParseResult {
  const seen = new Map<string, ElectiveRecord[]>();

  for (const row of values) {
    const code = (row[1] ?? "").trim();
    if (!COURSE_CODE_CELL.test(code)) continue;
    const title = (row[2] ?? "").replace(/\s+/g, " ").trim();
    const instructor = (row[6] ?? "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    const key = normalizeCourseCode(code);
    const bucket = seen.get(key) ?? [];
    bucket.push({ courseCode: key, courseTitle: title, ...(instructor ? { instructor } : {}) });
    seen.set(key, bucket);
  }

  const byCode = new Map<string, ElectiveRecord>();
  const ambiguous: string[] = [];
  for (const [code, records] of seen) {
    const titles = new Set(records.map((item) => item.courseTitle));
    const instructors = new Set(records.map((item) => item.instructor ?? ""));
    if (titles.size > 1 || instructors.size > 1) {
      ambiguous.push(code);
      continue;
    }
    byCode.set(code, records[0]!);
  }

  return { byCode, ambiguous };
}
