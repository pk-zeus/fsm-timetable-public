import type { ClassSession, Section, Timetable, Weekday } from "../types";
import { parseTimetableGrid, type TimetableParseResult } from "./parse-timetable";
import { indexCoursePlan, lookupCoursePlan, parseCoursePlan } from "./parse-course-plan";
import type { CoursePlanParseResult } from "./parse-course-plan";
import { parseElectives } from "./parse-electives";

export type RepeatOffering = {
  id: string;
  sectionId: string;
  courseTitle: string;
  courseCode?: string;
  teacher?: string;
  room?: string;
  day: Weekday;
  start: string;
  end: string;
};

export type Diagnostic = {
  level: "error" | "warning";
  kind: string;
  message: string;
  raw?: string;
};

export type BuildResult = {
  timetable: Timetable;
  /** Repeat-course offerings (unpadded section ids such as BBA3A). */
  repeatOfferings: RepeatOffering[];
  diagnostics: Diagnostic[];
  stats: {
    sessions: number;
    repeatOfferings: number;
    unresolvedEntries: number;
    failedCoursePlanJoins: number;
    duplicateSessions: number;
    nonClassEntries: number;
    /** Joins resolved from the Electives tab because Course Plan has no row. */
    electiveJoins: number;
    /** Sessions whose title resolved but whose instructor stayed ambiguous. */
    ambiguousInstructors: number;
  };
};

function sessionKey(sectionId: string, day: string, start: string, code: string, room: string) {
  return `${sectionId}|${day}|${start}|${code}|${room}`;
}

/**
 * Normalizes the parsed grid into the app's Timetable shape and joins the
 * Course Plan for instructor + canonical course titles. Nothing is guessed:
 * every ambiguity becomes a diagnostic instead of a silent assumption.
 */
export function buildTimetable(
  timetableValues: string[][],
  coursePlanValues: string[][],
  updatedAt: string,
  electivesValues: string[][] = [],
): BuildResult {
  const grid: TimetableParseResult = parseTimetableGrid(timetableValues);
  const plan: CoursePlanParseResult = parseCoursePlan(coursePlanValues);
  const planIndex = indexCoursePlan(plan.records);
  const electives = parseElectives(electivesValues);

  const diagnostics: Diagnostic[] = [];
  const sessions: ClassSession[] = [];
  const repeatOfferings: RepeatOffering[] = [];
  const seen = new Set<string>();
  const sectionIds = new Set<string>();
  let failedJoins = 0;
  let duplicates = 0;
  let electiveJoins = 0;
  let ambiguousInstructors = 0;

  for (const entry of grid.unresolved) {
    diagnostics.push({
      level: "warning",
      kind: "unresolved-source-entry",
      message: `${entry.reason} (row ${entry.sourceRow + 1}, room ${entry.room})`,
      raw: entry.raw,
    });
  }
  for (const entry of plan.unresolved) {
    diagnostics.push({
      level: "warning",
      kind: "unresolved-course-plan-row",
      message: `${entry.reason} (row ${entry.sourceRow + 1})`,
      raw: entry.raw,
    });
  }

  for (const entry of grid.entries) {
    for (const section of entry.sections) {
      const key = sessionKey(
        section.sectionId,
        entry.day,
        entry.start,
        entry.courseCode ?? entry.courseTitle,
        entry.room,
      );
      if (seen.has(key)) {
        duplicates += 1;
        diagnostics.push({
          level: "warning",
          kind: "duplicate-session",
          message: `duplicate session for ${section.sectionId} on ${entry.day} at ${entry.start}`,
          raw: entry.raw,
        });
        continue;
      }
      seen.add(key);

      const joined = lookupCoursePlan(planIndex, section.sectionId, entry.courseCode);
      let record: { courseTitle: string; instructor?: string } | null = null;
      if ("record" in joined) {
        record = joined.record;
        if (joined.ambiguity === "instructor") {
          ambiguousInstructors += 1;
          diagnostics.push({
            level: "warning",
            kind: "ambiguous-instructor",
            message: `course plan lists conflicting instructors for ${section.sectionId} / ${entry.courseCode ?? "?"}; instructor left blank`,
            raw: entry.raw,
          });
        }
      } else {
        // Secondary source: the Electives tab carries the cross-listed
        // elective offerings the Course Plan does not list per section.
        const elective = entry.courseCode ? electives.byCode.get(entry.courseCode) : undefined;
        if (elective) {
          electiveJoins += 1;
          record = elective;
        } else {
          failedJoins += 1;
          diagnostics.push({
            level: "warning",
            kind: "course-plan-join-failed",
            message: `${joined.reason} for ${section.sectionId} / ${entry.courseCode ?? "?"}`,
            raw: entry.raw,
          });
        }
      }

      const base = {
        courseTitle: record?.courseTitle || entry.courseTitle,
        ...(entry.courseCode ? { courseCode: entry.courseCode } : {}),
        ...(record?.instructor ? { teacher: record.instructor } : {}),
        room: entry.room,
        day: entry.day,
        start: entry.start,
        end: entry.end,
      };

      if (section.isRepeat) {
        repeatOfferings.push({
          id: key.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase(),
          sectionId: section.sectionId,
          ...base,
        });
        continue;
      }

      sectionIds.add(section.sectionId);
      sessions.push({
        id: key.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase(),
        sectionId: section.sectionId,
        ...base,
      });
    }
  }

  const sections: Section[] = [...sectionIds].sort().map((id) => ({
    id,
    label: id,
    group: id.replace(/\d.*$/, ""),
  }));

  return {
    timetable: { sections, sessions, updatedAt },
    repeatOfferings,
    diagnostics,
    stats: {
      sessions: sessions.length,
      repeatOfferings: repeatOfferings.length,
      unresolvedEntries: grid.unresolved.length + plan.unresolved.length,
      failedCoursePlanJoins: failedJoins,
      duplicateSessions: duplicates,
      nonClassEntries: grid.nonClassEntries.length,
      electiveJoins,
      ambiguousInstructors,
    },
  };
}
