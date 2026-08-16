import { toMinutes } from "./schedule";
import type { ClassSession, Weekday } from "./types";

export type RoomEntry = {
  /** Normalized lookup key, so "A- 201" and "A-201" are one room. */
  key: string;
  /** Room label as written in the source (most frequent spelling). */
  label: string;
};

export type TimeSlot = { start: string; end: string };

/** "A- 201" / "A--201" / "a-201" all normalize to the same room key. */
export function normalizeRoomKey(room: string): string {
  return room.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function isRoomLike(room: string): boolean {
  const trimmed = room.trim();
  if (trimmed.length < 2) return false;
  // A room label must contain at least one letter or digit after normalization.
  return normalizeRoomKey(trimmed).length >= 2;
}

/**
 * Derives the room list from the real sessions only. No room database, no
 * invented rooms; entries that are not room-like are excluded.
 */
export function buildRoomIndex(sessions: ClassSession[]): RoomEntry[] {
  const counts = new Map<string, Map<string, number>>();
  for (const session of sessions) {
    const room = session.room?.replace(/\s+/g, " ").trim();
    if (!room || !isRoomLike(room)) continue;
    const key = normalizeRoomKey(room);
    const labels = counts.get(key) ?? new Map<string, number>();
    labels.set(room, (labels.get(room) ?? 0) + 1);
    counts.set(key, labels);
  }

  return [...counts.entries()]
    .map(([key, labels]) => {
      const label = [...labels.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0];
      return { key, label: label ? label[0] : key };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

/** Distinct nominal time slots present in the source, earliest first. */
export function buildTimeSlots(sessions: ClassSession[]): TimeSlot[] {
  const seen = new Map<string, TimeSlot>();
  for (const session of sessions) {
    const key = `${session.start}-${session.end}`;
    if (!seen.has(key)) seen.set(key, { start: session.start, end: session.end });
  }
  return [...seen.values()].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end),
  );
}

/** Room keys with at least one class overlapping the given day + interval. */
export function occupiedRoomKeys(
  sessions: ClassSession[],
  day: Weekday,
  slot: TimeSlot,
): Set<string> {
  const from = toMinutes(slot.start);
  const to = toMinutes(slot.end);
  const occupied = new Set<string>();
  for (const session of sessions) {
    if (session.day !== day) continue;
    const room = session.room?.trim();
    if (!room) continue;
    if (toMinutes(session.start) < to && from < toMinutes(session.end)) {
      occupied.add(normalizeRoomKey(room));
    }
  }
  return occupied;
}

/**
 * Rooms with no class scheduled in the timetable for that day/interval.
 * This is timetable availability only — it can never prove a room is
 * physically free (makeup classes, meetings and events are not in the sheet).
 */
export function roomsFreeInTimetable(
  sessions: ClassSession[],
  day: Weekday,
  slot: TimeSlot,
): RoomEntry[] {
  const occupied = occupiedRoomKeys(sessions, day, slot);
  return buildRoomIndex(sessions).filter((room) => !occupied.has(room.key));
}
