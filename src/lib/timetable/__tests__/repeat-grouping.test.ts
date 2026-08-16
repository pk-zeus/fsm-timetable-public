import { describe, expect, it } from "vitest";
import { buildTimetable } from "../sheets/build";
import { getDaySessions } from "../schedule";
import { repeatOfferingSessions, toRepeatCourseOfferings } from "../repeat-courses";

/** Grid with one repeat course meeting twice a week plus a second repeat course. */
function grid(): string[][] {
  const rows: string[][] = [];
  const header = new Array(60).fill("");
  header[3] = "10:00-11:20";
  rows.push(header);

  const meeting = (day: string, room: string, cell: string, section: string) => {
    const row = new Array(60).fill("");
    row[0] = day;
    row[1] = "Classes";
    row[2] = room;
    row[3] = cell;
    row[4] = section;
    return row;
  };

  // Same repeat course, two weekly meetings.
  rows.push(meeting("Monday", "A-201", "AC 1002 Accounting I", "BBA3A"));
  rows.push(meeting("Wednesday", "A-305", "AC 1002 Accounting I", "BBA3A"));
  // A genuinely different repeat course.
  rows.push(meeting("Monday", "A-110", "MG 1001 Principles of Management", "BBA3A"));
  // A regular section session that must never be treated as a repeat.
  rows.push(meeting("Monday", "A-101", "EC 1005 Microeconomics", "BBA03A"));
  return rows;
}

const build = buildTimetable(grid(), [], new Date("2026-08-15T00:00:00Z").toISOString());
const offerings = toRepeatCourseOfferings(build.repeatOfferings);

describe("repeat-course grouping", () => {
  it("shows a multi-meeting repeat course once in the picker", () => {
    const accounting = offerings.filter((item) => item.courseCode === "AC1002");
    expect(accounting).toHaveLength(1);
    expect(accounting[0]!.meetings).toHaveLength(2);
  });

  it("adds every meeting when the course is selected", () => {
    const accounting = offerings.find((item) => item.courseCode === "AC1002")!;
    const sessions = repeatOfferingSessions(accounting, "A");
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.day).sort()).toEqual(["mon", "wed"]);
    expect(sessions.map((s) => s.room).sort()).toEqual(["A-201", "A-305"]);
    expect(new Set(sessions.map((s) => s.id)).size).toBe(2);
    const source = build.repeatOfferings.filter((item) => item.courseCode === "AC1002");
    expect(sessions.map((s) => `${s.day} ${s.start}-${s.end}`).sort()).toEqual(
      source.map((s) => `${s.day} ${s.start}-${s.end}`).sort(),
    );
    expect(sessions.every((s) => s.isRepeat)).toBe(true);
    expect(sessions.every((s) => s.courseCode === "AC1002")).toBe(true);
  });

  it("keeps two genuinely different repeat courses separate", () => {
    expect(offerings).toHaveLength(2);
    expect(new Set(offerings.map((item) => item.id)).size).toBe(2);
  });

  it("never gives a regular student repeat sessions", () => {
    const regular = getDaySessions(build.timetable, "BBA03A", "mon");
    expect(regular.every((session) => !session.isRepeat)).toBe(true);
    expect(regular.some((session) => session.courseCode === "AC1002")).toBe(false);
    expect(build.timetable.sessions.some((session) => session.sectionId === "BBA3A")).toBe(false);
  });
});
