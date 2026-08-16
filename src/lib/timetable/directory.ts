import { parseSectionCell, type CanonicalProgram } from "./sheets/normalize";
import type { RepeatOffering } from "./sheets/build";
import type { ClassSession, Timetable, Weekday } from "./types";
import { toMinutes } from "./schedule";

/**
 * Phase 3 discovery helpers. These read the already-normalized sessions that
 * the existing pipeline produced — nothing here re-parses the sheet, invents
 * data or keeps a second copy of the timetable.
 */

export type SectionInfo = {
  sectionId: string;
  program: CanonicalProgram | null;
  /** Batch id, e.g. "25". Null when the source id cannot be mapped. */
  batch: string | null;
  /** Section letter, e.g. "A". */
  section: string | null;
  isRepeat: boolean;
};

const sectionCache = new Map<string, SectionInfo>();

/** Reads program/batch/section back out of a normalized source section id. */
export function describeSection(sectionId: string): SectionInfo {
  const cached = sectionCache.get(sectionId);
  if (cached) return cached;
  const parsed = parseSectionCell(sectionId)[0];
  const info: SectionInfo = parsed
    ? {
        sectionId,
        program: parsed.program,
        batch: parsed.batch ?? null,
        section: parsed.section,
        isRepeat: parsed.isRepeat,
      }
    : { sectionId, program: null, batch: null, section: null, isRepeat: false };
  sectionCache.set(sectionId, info);
  return info;
}

/** "BBA · Batch 25 · Section A" — quiet context line for discovery screens. */
export function sectionContextLabel(sectionId: string): string {
  const info = describeSection(sectionId);
  const parts = [sectionId];
  if (info.program) parts.push(info.program);
  if (info.batch) parts.push(`Batch ${info.batch}`);
  return parts.join(" · ");
}

/** Repeat offerings expressed as sessions, so discovery tools see real room/teacher use. */
export function repeatOfferingsAsSessions(offerings: RepeatOffering[]): ClassSession[] {
  return offerings.map((offering) => ({
    id: `offering-${offering.id}`,
    sectionId: offering.sectionId,
    courseTitle: offering.courseTitle,
    ...(offering.courseCode ? { courseCode: offering.courseCode } : {}),
    ...(offering.teacher ? { teacher: offering.teacher } : {}),
    ...(offering.room ? { room: offering.room } : {}),
    day: offering.day,
    start: offering.start,
    end: offering.end,
    isRepeat: true,
  }));
}

/**
 * Every scheduled meeting in the source: regular sessions plus repeat-course
 * offerings. Used where real occupancy matters (rooms, teachers) — never to
 * give a regular student repeat classes.
 */
export function allScheduledSessions(payload: {
  timetable: Timetable;
  repeatOfferings: RepeatOffering[];
}): ClassSession[] {
  return [...payload.timetable.sessions, ...repeatOfferingsAsSessions(payload.repeatOfferings)];
}

export type ExploreFilter = {
  program: CanonicalProgram | "all";
  batch: string | "all";
  section: string | "all";
  day: Weekday | "all";
};

export const EMPTY_EXPLORE_FILTER: ExploreFilter = {
  program: "all",
  batch: "all",
  section: "all",
  day: "all",
};

export function isExploreFilterEmpty(filter: ExploreFilter): boolean {
  return (
    filter.program === "all" &&
    filter.batch === "all" &&
    filter.section === "all" &&
    filter.day === "all"
  );
}

/** Filters the existing sessions by program/batch/section/day. */
export function filterSessions(sessions: ClassSession[], filter: ExploreFilter): ClassSession[] {
  return sessions
    .filter((session) => {
      if (filter.day !== "all" && session.day !== filter.day) return false;
      if (filter.program === "all" && filter.batch === "all" && filter.section === "all") {
        return true;
      }
      const info = describeSection(session.sectionId);
      if (filter.program !== "all" && info.program !== filter.program) return false;
      if (filter.batch !== "all" && info.batch !== filter.batch) return false;
      if (filter.section !== "all" && info.section !== filter.section) return false;
      return true;
    })
    .sort(
      (a, b) =>
        toMinutes(a.start) - toMinutes(b.start) ||
        a.sectionId.localeCompare(b.sectionId) ||
        a.courseTitle.localeCompare(b.courseTitle),
    );
}

/** Groups sessions by weekday for readable, chunked rendering. */
export function groupSessionsByDay(sessions: ClassSession[]): Map<Weekday, ClassSession[]> {
  const grouped = new Map<Weekday, ClassSession[]>();
  for (const session of sessions) {
    const list = grouped.get(session.day);
    if (list) list.push(session);
    else grouped.set(session.day, [session]);
  }
  return grouped;
}
