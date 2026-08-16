import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { PageHeader } from "@/components/layout/page-header";
import {
  EmptyState,
  TimetableLockedState,
  TimetableSkeleton,
  TimetableErrorState,
} from "@/components/states/states";
import { ClassRow } from "@/components/timetable/class-row";
import { useTimetableSelection } from "@/lib/section-store";
import { sectionIdForSelection } from "@/lib/timetable/selection";
import { toRepeatCourseOfferings } from "@/lib/timetable/repeat-courses";
import { buildStudentWeek } from "@/lib/timetable/student-timetable";
import { findClashes } from "@/lib/timetable/clashes";
import { WEEKDAY_LABEL } from "@/lib/timetable/types";
import { formatDuration } from "@/lib/timetable/schedule";

const TITLE = "Clash Finder · FSM Timetable";
const DESCRIPTION =
  "Check whether any classes in your own Block A timetable overlap, including repeat courses you selected.";

export const Route = createFileRoute("/more/clash")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/clash" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/clash" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: ClashPage,
});

function ClashPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const selection = useTimetableSelection();
  const sectionId = sectionIdForSelection(selection);
  const offerings = useMemo(
    () => toRepeatCourseOfferings(data.repeatOfferings),
    [data.repeatOfferings],
  );

  const week = useMemo(
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
  const clashes = useMemo(() => findClashes(week), [week]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clash Finder"
        description="This checks only your own timetable — your section's classes plus any repeat courses you selected. Back-to-back classes are not clashes."
      />

      {!selection.isComplete || !sectionId ? (
        <TimetableLockedState />
      ) : clashes.length === 0 ? (
        <EmptyState
          title="No overlapping classes found."
          description={
            selection.studentType === "repeater" && selection.repeatCourses.length === 0
              ? "Select your repeat courses on the Today screen to include them in this check."
              : "Every class in your timetable starts after the previous one ends."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            {clashes.length} overlapping {clashes.length === 1 ? "pair" : "pairs"} in your
            timetable.
          </p>
          {clashes.map((clash) => (
            <section key={clash.id} className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {WEEKDAY_LABEL[clash.day]}
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  Overlaps by {formatDuration(clash.overlapMinutes)}
                </p>
              </div>
              <ul>
                <ClassRow session={clash.first} context={clash.first.sectionId} />
                <ClassRow session={clash.second} context={clash.second.sectionId} />
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
