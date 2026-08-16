import { toMinutes } from "./schedule";
import type { ClassSession, Weekday } from "./types";

export type Clash = {
  id: string;
  day: Weekday;
  first: ClassSession;
  second: ClassSession;
  /** Overlapping minutes — used only for a quiet explanatory line. */
  overlapMinutes: number;
};

/**
 * Finds genuine overlaps inside ONE student's own timetable.
 * Back-to-back classes (10:00–11:20 then 11:20–12:40) never clash, and
 * different rooms alone are never treated as a clash.
 */
export function findClashes(sessions: ClassSession[]): Clash[] {
  const byDay = new Map<Weekday, ClassSession[]>();
  for (const session of sessions) {
    const list = byDay.get(session.day);
    if (list) list.push(session);
    else byDay.set(session.day, [session]);
  }

  const clashes: Clash[] = [];
  for (const [day, list] of byDay) {
    const ordered = [...list].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (let i = 0; i < ordered.length; i += 1) {
      for (let j = i + 1; j < ordered.length; j += 1) {
        const first = ordered[i]!;
        const second = ordered[j]!;
        const firstEnd = toMinutes(first.end);
        const secondStart = toMinutes(second.start);
        // Sorted by start: once a later class starts at/after this one ends,
        // no further class on this day can overlap it.
        if (secondStart >= firstEnd) break;
        const overlapMinutes = Math.min(firstEnd, toMinutes(second.end)) - secondStart;
        if (overlapMinutes <= 0) continue;
        clashes.push({ id: `${first.id}__${second.id}`, day, first, second, overlapMinutes });
      }
    }
  }

  return clashes.sort(
    (a, b) => a.day.localeCompare(b.day) || toMinutes(a.first.start) - toMinutes(b.first.start),
  );
}
