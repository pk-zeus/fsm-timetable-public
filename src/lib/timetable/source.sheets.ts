import { queryOptions } from "@tanstack/react-query";
import { loadSheetsTimetable } from "./sheets/fetch.functions";
import type { SheetsTimetablePayload } from "./sheets/fetch.functions";

/**
 * Production data source: the validated Google Sheets timetable.
 * There is deliberately no fixture fallback — if the real source fails or
 * fails validation, the UI shows an error rather than fabricated classes.
 */
export const sheetsTimetableQueryOptions = queryOptions<SheetsTimetablePayload>({
  queryKey: ["timetable", "sheets"],
  queryFn: () => loadSheetsTimetable(),
  staleTime: 5 * 60 * 1000,
  retry: 1,
});
