import { describe, expect, it } from "vitest";
import { findClashes } from "../clashes";
import { normalizeRoomKey, roomsFreeInTimetable } from "../rooms";
import { describeSection } from "../directory";
import { buildTeacherIndex, searchTeachers } from "../teachers";
import type { ClassSession } from "../types";

function session(partial: Partial<ClassSession> & { id: string }): ClassSession {
  return {
    id: partial.id,
    sectionId: partial.sectionId ?? "BBA03A",
    courseCode: partial.courseCode ?? "MG101",
    courseTitle: partial.courseTitle ?? "Management",
    teacher: partial.teacher ?? "Dr Ayesha Khan",
    room: partial.room ?? "A-201",
    day: partial.day ?? "mon",
    start: partial.start ?? "08:30",
    end: partial.end ?? "09:50",
    isRepeat: partial.isRepeat ?? false,
  } as ClassSession;
}

describe("findClashes", () => {
  it("treats back-to-back classes as no clash", () => {
    const clashes = findClashes([
      session({ id: "a", start: "08:30", end: "09:50" }),
      session({ id: "b", start: "09:50", end: "11:10" }),
    ]);
    expect(clashes).toHaveLength(0);
  });

  it("reports overlapping classes on the same day with the overlap length", () => {
    const clashes = findClashes([
      session({ id: "a", start: "08:30", end: "09:50" }),
      session({ id: "b", start: "09:00", end: "10:20" }),
    ]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0]!.overlapMinutes).toBe(50);
  });

  it("ignores overlaps that fall on different days", () => {
    const clashes = findClashes([
      session({ id: "a", day: "mon" }),
      session({ id: "b", day: "tue" }),
    ]);
    expect(clashes).toHaveLength(0);
  });
});

describe("room availability", () => {
  it("normalizes inconsistent room spellings to one key", () => {
    expect(normalizeRoomKey("A- 201")).toBe(normalizeRoomKey("A-201"));
    expect(normalizeRoomKey("a 201")).toBe(normalizeRoomKey("A-201"));
  });

  it("counts a room as busy when a class overlaps the period, whatever the spelling", () => {
    const sessions = [
      session({ id: "a", room: "A- 201", start: "08:30", end: "09:50" }),
      session({ id: "b", room: "B-105", start: "11:20", end: "12:40" }),
    ];
    const free = roomsFreeInTimetable(sessions, "mon", { start: "08:30", end: "09:50" });
    expect(free.map((room) => room.key)).toEqual([normalizeRoomKey("B-105")]);
  });
});

describe("describeSection", () => {
  it("splits a padded section id into program, batch and section", () => {
    expect(describeSection("BBA03A")).toMatchObject({
      program: "BBA",
      batch: "25",
      section: "A",
    });
  });
});

describe("searchTeachers", () => {
  it("matches on any part of the name", () => {
    const index = buildTeacherIndex([session({ id: "a", teacher: "Dr Ayesha Khan" })]);
    expect(searchTeachers(index, "khan").map((t) => t.name)).toEqual(["Dr Ayesha Khan"]);
    expect(searchTeachers(index, "ayesha")).toHaveLength(1);
  });
});
