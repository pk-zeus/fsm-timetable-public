import { sheetsTimetableQueryOptions } from "./source.sheets";

/**
 * The active data source for the production UI: the real Google Sheets
 * timetable, normalized and validated server-side. Fixtures remain in the
 * repository for tests only and are never read by the app.
 */
export const timetableQueryOptions = sheetsTimetableQueryOptions;
