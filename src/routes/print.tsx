import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Printer } from "lucide-react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { useTimetableSelection } from "@/lib/section-store";
import { sectionIdForSelection } from "@/lib/timetable/selection";
import { toRepeatCourseOfferings } from "@/lib/timetable/repeat-courses";
import { buildStudentWeek } from "@/lib/timetable/student-timetable";
import { formatTime } from "@/lib/timetable/schedule";
import { WEEKDAYS, WEEKDAY_LABEL } from "@/lib/timetable/types";
import {
  TimetableLockedState,
  TimetableSkeleton,
  TimetableErrorState,
} from "@/components/states/states";

const TITLE = "Printable timetable · FSM Timetable";
const DESCRIPTION =
  "A clean one-page version of your weekly timetable, ready to print or save as PDF.";

export const Route = createFileRoute("/print")({
  validateSearch: (search: Record<string, unknown>) => ({
    auto: search["auto"] === true || search["auto"] === "true",
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: PrintPage,
});

function PrintPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const { auto } = Route.useSearch();
  const selection = useTimetableSelection();
  const sectionId = sectionIdForSelection(selection);

  const offerings = useMemo(
    () => toRepeatCourseOfferings(data.repeatOfferings),
    [data.repeatOfferings],
  );

  const sessions = useMemo(
    () =>
      buildStudentWeek({
        timetable: data.timetable,
        offerings,
        sectionId,
        studentType: selection.studentType,
        repeatCourses: selection.repeatCourses,
      }),
    [data.timetable, offerings, sectionId, selection.studentType, selection.repeatCourses],
  );

  const ready = Boolean(selection.isComplete && sectionId);

  useEffect(() => {
    if (!auto || !ready) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [auto, ready]);

  if (!ready) {
    return <TimetableLockedState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 print:block">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            FSM Timetable Fall 2026
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {sectionId} · {selection.program} · Batch {selection.batchId} ·{" "}
            {selection.studentType === "repeater" ? "Repeater" : "Regular"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 print:hidden"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </button>
      </div>

      {WEEKDAYS.map((day) => {
        const daySessions = sessions.filter((session) => session.day === day);
        return (
          <section key={day} className="break-inside-avoid">
            <h2 className="mb-1 border-b border-border pb-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              {WEEKDAY_LABEL[day]}
            </h2>
            {daySessions.length === 0 ? (
              <p className="py-1 text-[13px] text-muted-foreground">No classes</p>
            ) : (
              <table className="w-full border-collapse text-left text-[13px]">
                <tbody>
                  {daySessions.map((session) => (
                    <tr key={session.id} className="border-b border-border/60 last:border-b-0">
                      <td className="w-[150px] py-1.5 pr-3 align-top tabular-nums text-foreground">
                        {formatTime(session.start)} – {formatTime(session.end)}
                      </td>
                      <td className="py-1.5 pr-3 align-top font-medium text-foreground">
                        {session.courseTitle}
                        {session.isRepeat ? " (repeat)" : ""}
                        {session.courseCode ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {session.courseCode}
                          </span>
                        ) : null}
                      </td>
                      <td className="w-[110px] py-1.5 pr-3 align-top text-muted-foreground">
                        {session.room ?? ""}
                      </td>
                      <td className="w-[150px] py-1.5 align-top text-muted-foreground">
                        {session.teacher ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      <p className="pt-2 text-[11px] text-muted-foreground">
        Generated from FSM Timetable Fall 2026 · times are campus time (Asia/Karachi).
      </p>
    </div>
  );
}
