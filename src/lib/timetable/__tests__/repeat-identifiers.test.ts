import { describe, expect, it } from "vitest";
import { parseSectionCell, sectionIdFor } from "../sheets/normalize";
import { buildTimetable } from "../sheets/build";
import { sectionIdForSelection } from "../selection";
import { toRepeatCourseOfferings, repeatOfferingSessions } from "../repeat-courses";
import { getDaySessions } from "../schedule";

describe("BBA03A vs BBA3A", () => {
  it("parses the padded id as a normal section", () => {
    const [parsed] = parseSectionCell("BBA03A");
    expect(parsed?.sectionId).toBe("BBA03A");
    expect(parsed?.isRepeat).toBe(false);
    expect(parsed?.batch).toBe("25");
  });

  it("parses the unpadded id as a repeat offering with a distinct identifier", () => {
    const [parsed] = parseSectionCell("BBA3A");
    expect(parsed?.sectionId).toBe("BBA3A");
    expect(parsed?.isRepeat).toBe(true);
    expect(parsed?.sectionId).not.toBe("BBA03A");
  });

  it("never derives an unpadded identifier from a student selection", () => {
    expect(sectionIdFor("25", "BBA", "A")).toBe("BBA03A");
    expect(sectionIdForSelection({ batchId: "25", program: "BBA", section: "A" })).toBe("BBA03A");
  });
});

/** Minimal grid mirroring the source layout: day/room rows with slot columns. */
function grid(): string[][] {
  const rows: string[][] = [];
  const header = new Array(60).fill("");
  header[3] = "08:30-09:50";
  rows.push(header);
  const row = new Array(60).fill("");
  row[0] = "Monday";
  row[1] = "Classes";
  row[2] = "A-101";
  row[3] = "MG 1001 Principles of Management";
  row[4] = "BBA03A";
  rows.push(row);
  const repeatRow = new Array(60).fill("");
  repeatRow[0] = "Monday";
  repeatRow[1] = "Classes";
  repeatRow[2] = "A-102";
  repeatRow[3] = "AC 1002 Accounting I";
  repeatRow[4] = "BBA3A";
  rows.push(repeatRow);
  return rows;
}

describe("timetable build separation", () => {
  const build = buildTimetable(grid(), [], new Date("2026-08-15T00:00:00Z").toISOString());

  it("keeps repeat offerings out of the regular timetable", () => {
    const normal = getDaySessions(build.timetable, "BBA03A", "mon");
    expect(normal.every((session) => session.sectionId === "BBA03A")).toBe(true);
    expect(normal.some((session) => session.courseTitle.includes("Accounting"))).toBe(false);
    expect(build.timetable.sessions.some((s) => s.sectionId === "BBA3A")).toBe(false);
  });

  it("exposes the unpadded entry as a repeat offering a repeater can add", () => {
    const offerings = toRepeatCourseOfferings(build.repeatOfferings);
    expect(offerings.length).toBeGreaterThan(0);
    const offering = offerings[0]!;
    expect(offering.sectionId).toBe("BBA3A");
    const sessions = repeatOfferingSessions(offering, offering.availableSections[0] ?? "A");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.isRepeat).toBe(true);
    const combined = [...getDaySessions(build.timetable, "BBA03A", "mon"), ...sessions];
    expect(combined.filter((item) => item.isRepeat)).toHaveLength(1);
  });
});
