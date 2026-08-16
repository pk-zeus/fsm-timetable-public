import { normalizeCourseCode, parseSectionCell } from "./normalize";

export type CoursePlanRecord = {
  courseCode: string;
  courseTitle: string;
  /** Student-facing section id, e.g. "BBA01A" (subgroups collapse to it). */
  sectionId: string;
  raw: string;
  instructor?: string;
};

export type CoursePlanParseResult = {
  records: CoursePlanRecord[];
  /** Rows that look like course rows but could not be resolved safely. */
  unresolved: { raw: string; reason: string; sourceRow: number }[];
};

const COURSE_CODE_CELL = /^[A-Za-z]{2,3}\s*-?\s*\d{4}$/;

/**
 * Course Plan rows are flat: [Sr#, Code, Title, Cluster, Crd, Core/Elec,
 * Sections, Instructor]. Group heading rows have a single populated cell.
 */
export function parseCoursePlan(values: string[][]): CoursePlanParseResult {
  const records: CoursePlanRecord[] = [];
  const unresolved: CoursePlanParseResult["unresolved"] = [];

  values.forEach((row, sourceRow) => {
    const code = (row[1] ?? "").trim();
    if (!COURSE_CODE_CELL.test(code)) return;

    const title = (row[2] ?? "").replace(/\s+/g, " ").trim();
    const sectionCell = (row[6] ?? "").trim();
    const instructor = (row[7] ?? "").replace(/\s+/g, " ").trim();
    const sections = parseSectionCell(sectionCell);

    if (sections.length === 0) {
      unresolved.push({
        raw: `${code} | ${title} | ${sectionCell}`,
        reason: "course plan row without a parsable section code",
        sourceRow,
      });
      return;
    }

    for (const section of sections) {
      records.push({
        courseCode: normalizeCourseCode(code),
        courseTitle: title,
        sectionId: section.sectionId,
        raw: section.raw,
        ...(instructor ? { instructor } : {}),
      });
    }
  });

  return { records, unresolved };
}

export type CoursePlanIndex = Map<string, CoursePlanRecord[]>;

export function indexCoursePlan(records: CoursePlanRecord[]): CoursePlanIndex {
  const index: CoursePlanIndex = new Map();
  for (const record of records) {
    const key = `${record.sectionId}|${record.courseCode}`;
    const bucket = index.get(key);
    if (bucket) bucket.push(record);
    else index.set(key, [record]);
  }
  return index;
}

/**
 * Join is strict about instructors: one is only attached when every matching
 * course-plan record agrees on the name. When lab subgroups (BBA01A1 /
 * BBA01A2) disagree on the instructor but agree on the course title, the
 * canonical title is still returned and the instructor is left unresolved and
 * reported — never picked arbitrarily.
 */
export function lookupCoursePlan(
  index: CoursePlanIndex,
  sectionId: string,
  courseCode: string | undefined,
): { record: CoursePlanRecord; ambiguity?: "instructor" } | { reason: string } {
  if (!courseCode) return { reason: "session has no course code" };
  const matches = index.get(`${sectionId}|${courseCode}`);
  if (!matches || matches.length === 0) return { reason: "no course plan row for section + code" };
  const instructors = new Set(matches.map((item) => item.instructor ?? ""));
  if (instructors.size > 1) {
    const titles = new Set(matches.map((item) => item.courseTitle));
    if (titles.size > 1) return { reason: "ambiguous instructor and title in course plan" };
    const { instructor: _ambiguous, ...rest } = matches[0]!;
    return { record: rest, ambiguity: "instructor" };
  }
  return { record: matches[0]! };
}
