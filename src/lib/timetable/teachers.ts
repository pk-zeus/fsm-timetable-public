import { toMinutes } from "./schedule";
import type { ClassSession } from "./types";

export type TeacherEntry = {
  /** Lower-cased lookup key. */
  key: string;
  /** Instructor name exactly as the normalized source records it. */
  name: string;
  sessionCount: number;
};

export type TeacherIndex = {
  teachers: TeacherEntry[];
  sessionsByKey: Map<string, ClassSession[]>;
};

function keyOf(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Builds a unique instructor index from the already-normalized sessions.
 * Sessions with no instructor are skipped — a missing teacher is never guessed.
 */
export function buildTeacherIndex(sessions: ClassSession[]): TeacherIndex {
  const sessionsByKey = new Map<string, ClassSession[]>();
  const nameByKey = new Map<string, string>();

  for (const session of sessions) {
    const name = session.teacher?.replace(/\s+/g, " ").trim();
    if (!name) continue;
    const key = keyOf(name);
    if (!nameByKey.has(key)) nameByKey.set(key, name);
    const list = sessionsByKey.get(key);
    if (list) list.push(session);
    else sessionsByKey.set(key, [session]);
  }

  for (const list of sessionsByKey.values()) {
    list.sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        toMinutes(a.start) - toMinutes(b.start) ||
        a.sectionId.localeCompare(b.sectionId),
    );
  }

  const teachers = [...nameByKey.entries()]
    .map(([key, name]) => ({ key, name, sessionCount: sessionsByKey.get(key)?.length ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { teachers, sessionsByKey };
}

/**
 * Partial, token-tolerant search: "ali" matches "Muhammad Ali" and "Ali Raza",
 * and "muh ali" matches "Muhammad Ali".
 */
export function searchTeachers(index: TeacherIndex, query: string): TeacherEntry[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return index.teachers;
  return index.teachers.filter((teacher) => tokens.every((token) => teacher.key.includes(token)));
}

/** All sessions taught by exactly this instructor. */
export function teacherSessions(index: TeacherIndex, name: string): ClassSession[] {
  return index.sessionsByKey.get(keyOf(name)) ?? [];
}
