import { repeatOfferingSessions, type RepeatCourseOffering } from "./repeat-courses";
import { toMinutes } from "./schedule";
import type { RepeatCourseSelection } from "./repeat-courses";
import type { ClassSession, Timetable, Weekday } from "./types";
import type { StudentType } from "./selection";

/**
 * The student's own resulting weekly timetable: their section's real sessions,
 * plus repeat meetings ONLY for a repeater who explicitly selected them.
 */
export function buildStudentWeek(input: {
  timetable: Timetable;
  offerings: RepeatCourseOffering[];
  sectionId: string | null;
  studentType: StudentType;
  repeatCourses: RepeatCourseSelection[];
  /** Restrict to one weekday; omit for the whole week. */
  day?: Weekday;
}): ClassSession[] {
  const { timetable, offerings, sectionId, studentType, repeatCourses, day } = input;
  if (!sectionId) return [];

  const regular = timetable.sessions.filter(
    (session) => session.sectionId === sectionId && (!day || session.day === day),
  );

  const repeats =
    studentType === "repeater"
      ? repeatCourses.flatMap((selected) => {
          const offering = offerings.find((item) => item.id === selected.offeringId);
          if (!offering) return [];
          return repeatOfferingSessions(offering, selected.section).filter(
            (session) => !day || session.day === day,
          );
        })
      : [];

  return [...regular, ...repeats].sort(
    (a, b) => a.day.localeCompare(b.day) || toMinutes(a.start) - toMinutes(b.start),
  );
}
