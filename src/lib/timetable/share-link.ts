import { BATCHES, PROGRAMS, SECTIONS } from "./selection";
import type { BatchId, Program, SectionLabel, StudentType } from "./selection";
import type { RepeatCourseSelection } from "./repeat-courses";

export type SharedSelection = {
  batchId: BatchId | null;
  program: Program | null;
  section: SectionLabel | null;
  studentType: StudentType;
  repeatCourses: RepeatCourseSelection[];
};

/** Query string (without "?") describing the whole selection, for deep links. */
export function shareParams(selection: SharedSelection): string {
  const params = new URLSearchParams();
  if (selection.batchId) params.set("batch", selection.batchId);
  if (selection.program) params.set("program", selection.program);
  if (selection.section) params.set("section", selection.section);
  params.set("type", selection.studentType);
  if (selection.studentType === "repeater" && selection.repeatCourses.length > 0) {
    params.set(
      "repeats",
      selection.repeatCourses.map((item) => `${item.offeringId}:${item.section}`).join(","),
    );
  }
  return params.toString();
}

export function shareUrl(selection: SharedSelection, origin: string, path = "/"): string {
  return `${origin.replace(/\/$/, "")}${path}?${shareParams(selection)}`;
}

/**
 * Reads a shared selection out of a query string. Returns null when the link
 * carries no selection at all, so normal visits never clobber saved settings.
 */
export function parseShareParams(search: string): Partial<SharedSelection> | null {
  const params = new URLSearchParams(search);
  const result: Partial<SharedSelection> = {};

  const batch = (params.get("batch") ?? "").replace(/^batch\s*/i, "").trim();
  const match = BATCHES.find((item) => item.id === batch);
  if (match) result.batchId = match.id;

  const program = params.get("program")?.trim().toLowerCase();
  const programMatch = PROGRAMS.find((item) => item.toLowerCase() === program);
  if (programMatch) result.program = programMatch;

  const section = params.get("section")?.trim().toUpperCase();
  const sectionMatch = SECTIONS.find((item) => item === section);
  if (sectionMatch) result.section = sectionMatch;

  const type = params.get("type");
  if (type === "regular" || type === "repeater") result.studentType = type;

  const repeats = params.get("repeats");
  if (repeats) {
    const parsed = repeats
      .split(",")
      .map((entry) => entry.split(":"))
      .filter((parts): parts is [string, string] => Boolean(parts[0] && parts[1]))
      .map(([offeringId, section2]) => ({ offeringId, section: section2.toUpperCase() }));
    if (parsed.length > 0) result.repeatCourses = parsed;
  }

  return Object.keys(result).length > 0 ? result : null;
}
