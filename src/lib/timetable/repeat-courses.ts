import type { RepeatOffering } from "./sheets/build";
import type { ClassSession, Weekday } from "./types";

/** One concrete weekly meeting of a repeat course. */
export type RepeatCourseMeeting = {
  id: string;
  day: Weekday;
  start: string;
  end: string;
  room: string;
  teacher: string;
};

export type RepeatCourseOffering = {
  id: string;
  courseTitle: string;
  courseCode: string;
  /** All weekly meetings that belong to this one repeat offering. */
  meetings: RepeatCourseMeeting[];
  /** Section letter(s) this repeat offering is held for. */
  availableSections: string[];
  /** Unpadded repeat identifier from the sheet, e.g. "BBA3A". */
  sectionId: string;
};

export type RepeatCourseSelection = {
  offeringId: string;
  section: string;
};

const REPEAT_ID_RE = /^([A-Z]{2,4})(\d{1,2})([A-D])$/;

function sectionLetterOf(sectionId: string): string {
  return REPEAT_ID_RE.exec(sectionId.toUpperCase())?.[3] ?? "";
}

/**
 * Groups raw per-meeting repeat entries into one selectable course per
 * (repeat section id + course). Meetings of genuinely different courses or
 * different repeat sections stay separate.
 */
export function toRepeatCourseOfferings(offerings: RepeatOffering[]): RepeatCourseOffering[] {
  const groups = new Map<string, RepeatCourseOffering>();

  for (const offering of offerings) {
    const sectionId = offering.sectionId;
    const courseCode = offering.courseCode ?? "";
    const key = `${sectionId.toUpperCase()}|${(courseCode || offering.courseTitle).toUpperCase()}`;
    const letter = sectionLetterOf(sectionId);
    const meeting: RepeatCourseMeeting = {
      id: offering.id,
      day: offering.day,
      start: offering.start,
      end: offering.end,
      room: offering.room ?? "",
      teacher: offering.teacher ?? "",
    };

    const existing = groups.get(key);
    if (existing) {
      existing.meetings.push(meeting);
      continue;
    }
    groups.set(key, {
      id: key.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase(),
      courseTitle: offering.courseTitle,
      courseCode,
      meetings: [meeting],
      availableSections: letter ? [letter] : [],
      sectionId,
    });
  }

  const result = [...groups.values()];
  for (const group of result) {
    group.meetings.sort(
      (a, b) =>
        a.day.localeCompare(b.day) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id),
    );
  }
  return result.sort(
    (a, b) =>
      a.courseTitle.localeCompare(b.courseTitle) ||
      a.sectionId.localeCompare(b.sectionId) ||
      (a.meetings[0]?.start ?? "").localeCompare(b.meetings[0]?.start ?? ""),
  );
}

/** Every session a repeater gets by selecting this one repeat course. */
export function repeatOfferingSessions(
  offering: RepeatCourseOffering,
  section: string,
): ClassSession[] {
  return offering.meetings.map((meeting) => ({
    id: `repeat-${meeting.id}-${section}`,
    sectionId: offering.sectionId,
    courseTitle: offering.courseTitle,
    ...(offering.courseCode ? { courseCode: offering.courseCode } : {}),
    ...(meeting.teacher ? { teacher: meeting.teacher } : {}),
    ...(meeting.room ? { room: meeting.room } : {}),
    day: meeting.day,
    start: meeting.start,
    end: meeting.end,
    isRepeat: true,
  }));
}
