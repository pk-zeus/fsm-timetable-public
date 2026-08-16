import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { formatTime, getCurrentSession, getDaySessions, weekdayOf } from "@/lib/timetable/schedule";
import { WEEKDAYS, WEEKDAY_LABEL, type Weekday } from "@/lib/timetable/types";
import { useNow } from "@/hooks/use-now";
import { useTimetableSelection } from "@/lib/section-store";
import { SectionSelector } from "@/components/section/section-selector";
import { DayNavigator } from "@/components/timetable/day-navigator";
import { ClassRow } from "@/components/timetable/class-row";
import {
  TimetableLockedState,
  TimetableSkeleton,
  TimetableErrorState,
} from "@/components/states/states";
import { sectionIdForSelection } from "@/lib/timetable/selection";
import { repeatOfferingSessions, toRepeatCourseOfferings } from "@/lib/timetable/repeat-courses";

const TITLE = "Week · FSM Timetable";
const DESCRIPTION =
  "Browse the full week of classes for your section — times, rooms and instructors, day by day.";

export const Route = createFileRoute("/week")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/week" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/week" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: WeekPage,
});

function WeekPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const now = useNow();
  const today = weekdayOf(now);
  const selection = useTimetableSelection();
  const sectionId = sectionIdForSelection(selection);
  const timetable = data.timetable;
  const offerings = toRepeatCourseOfferings(data.repeatOfferings);
  const [day, setDay] = useState<Weekday>(WEEKDAYS.includes(today) ? today : "mon");
  const sessionsForDay = (currentDay: Weekday) => {
    if (!sectionId) return [];
    const normalSessions = getDaySessions(timetable, sectionId, currentDay);
    const repeatSessions =
      selection.studentType === "repeater"
        ? selection.repeatCourses.flatMap((repeat) => {
            const offering = offerings.find((item) => item.id === repeat.offeringId);
            return offering
              ? repeatOfferingSessions(offering, repeat.section).filter(
                  (session) => session.day === currentDay,
                )
              : [];
          })
        : [];
    return [...normalSessions, ...repeatSessions].sort((a, b) => a.start.localeCompare(b.start));
  };

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Weekly timetable for FAST School of Management, Block A</h1>
      <SectionSelector />

      {selection.isComplete && sectionId ? (
        <>
          {/* Mobile & tablet: one readable day at a time */}
          <div className="space-y-4 lg:hidden">
            <DayNavigator value={day} onChange={setDay} today={today} />
            <DayColumn
              heading={WEEKDAY_LABEL[day]}
              sessions={sessionsForDay(day)}
              now={day === today ? now : undefined}
            />
          </div>

          {/* Desktop: the whole week side by side */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-5">
            {WEEKDAYS.map((d) => (
              <DayColumn
                key={d}
                heading={WEEKDAY_LABEL[d]}
                sessions={sessionsForDay(d)}
                now={d === today ? now : undefined}
                compact
              />
            ))}
          </div>
        </>
      ) : (
        <TimetableLockedState />
      )}
    </div>
  );
}

function DayColumn({
  heading,
  sessions,
  compact,
  now,
}: {
  heading: string;
  sessions: ReturnType<typeof getDaySessions>;
  compact?: boolean;
  /** Pass only for the column representing today, to drive the live NOW state. */
  now?: Date | undefined;
}) {
  const current = now ? getCurrentSession(sessions, now) : null;

  return (
    <section aria-label={heading}>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </h2>
      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No classes
        </div>
      ) : (
        <ul className="rounded-lg border border-border bg-card">
          {sessions.map((session) => {
            const isNow = session.id === current?.id;
            return compact ? (
              <li
                key={session.id}
                className={cn(
                  "relative border-b border-border px-3 py-3 transition-[background-color,opacity] duration-150 last:border-b-0",
                  isNow && "rounded-md border-b-transparent bg-now-tint",
                )}
              >
                {isNow ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary"
                  />
                ) : null}
                {isNow ? (
                  <span className="mb-0.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 motion-safe:animate-[pulse_1.8s_ease-in-out_infinite]"
                    />
                    Now
                  </span>
                ) : null}
                <p className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatTime(session.start)}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                  {session.courseTitle}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
                  {session.courseCode ? <span>{session.courseCode}</span> : null}
                  {session.room ? (
                    <span className="inline-flex items-center gap-1">
                      {session.courseCode ? <span aria-hidden="true">·</span> : null}
                      <MapPin
                        className="h-3 w-3 shrink-0 text-muted-foreground/70"
                        aria-hidden="true"
                      />
                      {session.room}
                    </span>
                  ) : null}
                </p>
                {session.isRepeat ? (
                  <p className="mt-1 text-[12px] font-medium text-primary">Repeat course</p>
                ) : null}
              </li>
            ) : (
              <ClassRow key={session.id} session={session} isNow={isNow} now={now} />
            );
          })}
        </ul>
      )}
    </section>
  );
}
