import { describe, expect, it } from "vitest";
import {
  campusParts,
  getCurrentSession,
  getNextSession,
  minutesUntil,
  weekdayOf,
} from "../schedule";
import type { ClassSession } from "../types";

const session = (start: string, end: string): ClassSession => ({
  id: `${start}-${end}`,
  sectionId: "BBA03A",
  courseTitle: "Test",
  day: "mon",
  start,
  end,
});

describe("Asia/Karachi handling", () => {
  // 2026-08-17T05:00:00Z === Monday 10:00 in Karachi (UTC+5).
  const now = new Date("2026-08-17T05:00:00Z");

  it("derives the campus weekday and minutes regardless of host timezone", () => {
    expect(weekdayOf(now)).toBe("mon");
    expect(campusParts(now).minutes).toBe(10 * 60);
  });

  it("selects current and next class in campus time", () => {
    const sessions = [
      session("08:30", "09:50"),
      session("10:00", "11:20"),
      session("13:00", "14:20"),
    ];
    expect(getCurrentSession(sessions, now)?.start).toBe("10:00");
    expect(getNextSession(sessions, now)?.start).toBe("13:00");
    expect(minutesUntil("13:00", now)).toBe(180);
  });

  it("rolls over the weekday at Karachi midnight, not UTC midnight", () => {
    // Monday 23:30 UTC is already Tuesday 04:30 in Karachi.
    expect(weekdayOf(new Date("2026-08-17T23:30:00Z"))).toBe("tue");
  });
});
