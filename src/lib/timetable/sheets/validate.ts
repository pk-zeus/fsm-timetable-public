import { PROGRAMS, BATCH_BY_SEMESTER, STUDENT_SECTIONS } from "./normalize";
import type { BuildResult, Diagnostic } from "./build";
import { toMinutes } from "../schedule";

export type ValidationReport = {
  ok: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  stats: BuildResult["stats"];
};

const SECTION_ID_RE = /^(BBA|FT|BSBA|AF)(\d{2})([A-D])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const PROGRAM_BY_PREFIX: Record<string, (typeof PROGRAMS)[number]> = {
  BBA: "BBA",
  FT: "FinTech",
  BSBA: "BSBA",
  AF: "A&F",
};

/**
 * Blocks the real data from reaching the UI when it is structurally unsound.
 * Individual unresolved source rows stay warnings — they are reported, never
 * silently turned into classes.
 */
export function validateBuild(build: BuildResult): ValidationReport {
  const errors: Diagnostic[] = [];
  const warnings = build.diagnostics.filter((item) => item.level === "warning");
  errors.push(...build.diagnostics.filter((item) => item.level === "error"));

  if (build.timetable.sessions.length === 0) {
    errors.push({
      level: "error",
      kind: "empty-dataset",
      message: "no sessions were normalized from the source sheet",
    });
  }

  for (const session of build.timetable.sessions) {
    const id = session.sectionId;
    const match = SECTION_ID_RE.exec(id);
    if (!match) {
      errors.push({
        level: "error",
        kind: "invalid-section-id",
        message: `invalid section identifier "${id}"`,
      });
      continue;
    }
    const [, prefix, semester, section] = match as unknown as [string, string, string, string];
    if (!PROGRAM_BY_PREFIX[prefix]) {
      errors.push({
        level: "error",
        kind: "invalid-program",
        message: `unknown program ${prefix}`,
      });
    }
    if (!BATCH_BY_SEMESTER[semester]) {
      errors.push({
        level: "error",
        kind: "invalid-semester",
        message: `unknown semester ${semester} in ${id}`,
      });
    }
    if (!STUDENT_SECTIONS.includes(section as (typeof STUDENT_SECTIONS)[number])) {
      errors.push({
        level: "error",
        kind: "invalid-section",
        message: `unknown section ${section} in ${id}`,
      });
    }
    if (!TIME_RE.test(session.start) || !TIME_RE.test(session.end)) {
      errors.push({
        level: "error",
        kind: "invalid-time",
        message: `invalid time on ${id} ${session.courseTitle} (${session.start}-${session.end})`,
      });
    } else if (toMinutes(session.end) <= toMinutes(session.start)) {
      errors.push({
        level: "error",
        kind: "invalid-time-range",
        message: `end before start on ${id} ${session.courseTitle}`,
      });
    }
    if (!session.courseCode) {
      warnings.push({
        level: "warning",
        kind: "missing-course-code",
        message: `no course code for "${session.courseTitle}" (${id})`,
      });
    }
  }

  // A repeat offering must never share an identifier with a normal section.
  const normalIds = new Set(build.timetable.sessions.map((item) => item.sectionId));
  for (const offering of build.repeatOfferings) {
    if (normalIds.has(offering.sectionId)) {
      errors.push({
        level: "error",
        kind: "repeat-section-collision",
        message: `repeat offering ${offering.sectionId} collides with a regular section`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings, stats: build.stats };
}
