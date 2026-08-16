export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** One scheduled class occurrence for one section. */
export type ClassSession = {
  id: string;
  sectionId: string;
  courseTitle: string;
  courseCode?: string;
  teacher?: string;
  room?: string;
  day: Weekday;
  /** Local wall-clock time, "HH:mm" (24h). */
  start: string;
  /** Local wall-clock time, "HH:mm" (24h). */
  end: string;
  /** Phase 1 marker for an independently selected repeat-course offering. */
  isRepeat?: boolean;
};

export type Section = {
  id: string;
  label: string;
  /** Programme grouping used to group options in the selector. */
  group: string;
};

export type Timetable = {
  sections: Section[];
  sessions: ClassSession[];
  /** ISO timestamp of the last successful sync of the source. */
  updatedAt: string;
};

/**
 * The single seam between the app and wherever timetable data comes from.
 * The production implementation is the server-side Google Sheets adapter.
 */
export interface TimetableSource {
  load(): Promise<Timetable>;
}
