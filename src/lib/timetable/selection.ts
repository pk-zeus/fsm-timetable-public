import { sectionIdFor } from "./sheets/normalize";
import type { CanonicalProgram } from "./sheets/normalize";

export const BATCHES = [
  { id: "23", label: "Batch 23 · 7th Semester" },
  { id: "24", label: "Batch 24 · 5th Semester" },
  { id: "25", label: "Batch 25 · 3rd Semester" },
  { id: "26", label: "Batch 26 · 1st Semester" },
] as const;

export const PROGRAMS = ["BBA", "FinTech", "BSBA", "A&F"] as const;
export const SECTIONS = ["A", "B", "C", "D"] as const;

export type BatchId = (typeof BATCHES)[number]["id"];
export type Program = CanonicalProgram;
export type SectionLabel = (typeof SECTIONS)[number];
export type StudentType = "regular" | "repeater";

export type TimetableSelection = {
  batchId: BatchId | null;
  program: Program | null;
  section: SectionLabel | null;
};

/**
 * Maps the student's batch/program/section onto the real, zero-padded source
 * section identifier (e.g. Batch 25 + BBA + A -> "BBA03A"). Unpadded repeat
 * identifiers such as "BBA3A" can never be produced here.
 */
export function sectionIdForSelection(selection: TimetableSelection): string | null {
  return sectionIdFor(selection.batchId, selection.program, selection.section);
}
