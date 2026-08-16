import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TimetableSkeleton, TimetableErrorState } from "@/components/states/states";
import { ClassRow } from "@/components/timetable/class-row";
import { WEEKDAY_LABEL } from "@/lib/timetable/types";
import {
  allScheduledSessions,
  groupSessionsByDay,
  sectionContextLabel,
} from "@/lib/timetable/directory";
import { buildTeacherIndex, searchTeachers, teacherSessions } from "@/lib/timetable/teachers";

const TITLE = "Teacher Finder · FSM Timetable";
const DESCRIPTION =
  "Search any School of Management Block A instructor and see the classes they teach — day, time, room and section.";
/** Matches shown before the student asks for the full list. */
const PREVIEW_SIZE = 6;

export const Route = createFileRoute("/more/teachers")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/teachers" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/teachers" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: TeachersPage,
});

function TeachersPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const index = useMemo(() => buildTeacherIndex(allScheduledSessions(data)), [data]);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // Debounced so typing does not re-filter 122 instructors on every keystroke.
  const debouncedQuery = useDebouncedValue(query, 200);

  const matches = useMemo(() => searchTeachers(index, debouncedQuery), [index, debouncedQuery]);
  const isTyping = query.trim() !== debouncedQuery.trim();
  // Show a short preview list rather than every instructor at once.
  const visible = showAll ? matches : matches.slice(0, PREVIEW_SIZE);
  const sessions = selected ? teacherSessions(index, selected) : [];
  const grouped = useMemo(() => groupSessionsByDay(sessions), [sessions]);

  // A new search always returns to the six-result preview.
  useEffect(() => {
    setShowAll(false);
  }, [query]);

  if (selected) {
    return (
      <div className="space-y-5">
        <PageHeader title={selected} description="Classes recorded for this instructor." />
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Choose another teacher
        </button>

        {sessions.length === 0 ? (
          <EmptyState title="No classes recorded for this instructor." />
        ) : (
          [...grouped.entries()].map(([day, daySessions]) => (
            <section key={day} aria-label={WEEKDAY_LABEL[day]}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {WEEKDAY_LABEL[day]}
              </h2>
              <ul className="rounded-lg border border-border bg-card">
                {daySessions.map((session) => (
                  <ClassRow
                    key={session.id}
                    session={session}
                    context={sectionContextLabel(session.sectionId)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teacher Finder"
        description="Search an instructor by any part of their name to see the classes they teach."
      />

      <label className="relative block">
        <span className="sr-only">Search teachers</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          autoComplete="off"
          className="min-h-12 w-full rounded-md border border-input bg-card pl-9 pr-3 text-[15px] text-foreground transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      {isTyping ? (
        <p className="px-1 text-sm text-muted-foreground" role="status">
          Searching…
        </p>
      ) : matches.length === 0 ? (
        <EmptyState
          title="No teacher matches that search."
          description="Try a shorter part of the name."
        />
      ) : (
        <>
          <ul className="rounded-lg border border-border bg-card">
            {visible.map((teacher) => (
              <li key={teacher.key} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setSelected(teacher.name)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle"
                >
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-foreground">
                    {teacher.name}
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                    {teacher.sessionCount} {teacher.sessionCount === 1 ? "class" : "classes"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!showAll && matches.length > PREVIEW_SIZE ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 inline-flex min-h-11 items-center text-[15px] font-medium text-primary"
            >
              Show all {matches.length} teachers
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
