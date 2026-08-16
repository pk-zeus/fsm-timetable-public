import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import {
  formatDayHeading,
  getCurrentSession,
  getDaySessions,
  getNextSession,
  weekdayOf,
} from "@/lib/timetable/schedule";
import { useNow } from "@/hooks/use-now";
import { useTimetableSelection } from "@/lib/section-store";
import { SectionSelector } from "@/components/section/section-selector";
import { RepeatCourses } from "@/components/section/repeat-courses";
import { NowNextCard } from "@/components/timetable/now-next-card";
import { ClassRow } from "@/components/timetable/class-row";
import { LastUpdated } from "@/components/timetable/last-updated";
import {
  EmptyState,
  TimetableLockedState,
  TimetableSkeleton,
  TimetableErrorState,
} from "@/components/states/states";
import { sectionIdForSelection } from "@/lib/timetable/selection";
import { repeatOfferingSessions, toRepeatCourseOfferings } from "@/lib/timetable/repeat-courses";

const TITLE = "Today · FSM Timetable";
const DESCRIPTION =
  "See your current class, next class, room and full day schedule for FAST School of Management Block A on your phone.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: TodayPage,
});

function TodayPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const now = useNow();
  const selection = useTimetableSelection();
  const today = weekdayOf(now);
  const sectionId = sectionIdForSelection(selection);
  const timetable = data.timetable;
  const offerings = useMemo(
    () => toRepeatCourseOfferings(data.repeatOfferings),
    [data.repeatOfferings],
  );

  const sessions = useMemo(() => {
    if (!sectionId) return [];
    const normalSessions = getDaySessions(timetable, sectionId, today);
    const repeatSessions =
      selection.studentType === "repeater"
        ? selection.repeatCourses.flatMap((repeat) => {
            const offering = offerings.find((item) => item.id === repeat.offeringId);
            return offering
              ? repeatOfferingSessions(offering, repeat.section).filter(
                  (session) => session.day === today,
                )
              : [];
          })
        : [];
    return [...normalSessions, ...repeatSessions].sort((a, b) => a.start.localeCompare(b.start));
  }, [timetable, offerings, sectionId, selection.studentType, selection.repeatCourses, today]);
  const current = getCurrentSession(sessions, now);
  const next = getNextSession(sessions, now);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Today&apos;s schedule — FSM Timetable, Block A, Fall 2026</h1>
      <SectionSelector />

      {selection.isComplete ? (
        <>
          <StudentTypeSelector />
          {selection.studentType === "repeater" ? <RepeatCourses offerings={offerings} /> : null}
          <div className="transition-[opacity,transform] duration-150">
            <NowNextCard current={current} next={next} now={now} />
          </div>

          <section aria-label="Today's schedule">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {formatDayHeading(now)}
            </h2>
            {sessions.length === 0 ? (
              <EmptyState
                title="Nothing scheduled today."
                description="Check the weekly view for the rest of the week."
              />
            ) : (
              <ul className="rounded-lg border border-border bg-card">
                {sessions.map((session) => (
                  <ClassRow
                    key={session.id}
                    session={session}
                    isNow={session.id === current?.id}
                    now={now}
                  />
                ))}
              </ul>
            )}
          </section>

          <LastUpdated iso={timetable.updatedAt} now={now} />
        </>
      ) : (
        <TimetableLockedState />
      )}
    </div>
  );
}

function StudentTypeSelector() {
  const { studentType, setStudentType } = useTimetableSelection();

  return (
    <fieldset className="border-t border-border pt-4">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Student type
      </legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-foreground">
          <input
            type="radio"
            name="student-type"
            value="regular"
            checked={studentType === "regular"}
            onChange={() => setStudentType("regular")}
            className="h-4 w-4 accent-primary"
          />
          Regular student
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-foreground">
          <input
            type="radio"
            name="student-type"
            value="repeater"
            checked={studentType === "repeater"}
            onChange={() => setStudentType("repeater")}
            className="h-4 w-4 accent-primary"
          />
          Repeater student
        </label>
      </div>
    </fieldset>
  );
}
