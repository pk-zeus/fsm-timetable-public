import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TimetableSkeleton, TimetableErrorState } from "@/components/states/states";
import { SelectField } from "@/components/section/section-selector";
import { ClassRow } from "@/components/timetable/class-row";
import { WEEKDAYS, WEEKDAY_LABEL } from "@/lib/timetable/types";
import {
  describeSection,
  filterSessions,
  groupSessionsByDay,
  isExploreFilterEmpty,
  sectionContextLabel,
  type ExploreFilter,
} from "@/lib/timetable/directory";
import { PROGRAMS } from "@/lib/timetable/selection";
import { BATCHES } from "@/lib/timetable/selection";

const TITLE = "Explore · FSM Timetable";
const DESCRIPTION =
  "Browse School of Management Block A classes by program, batch, section and day — beyond your own timetable.";

const PAGE_SIZE = 15;

/** Filters live in the URL so going back to Explore restores the same view. */
function coerce(value: unknown): string {
  // Batch ids look numeric ("24"), so a shared link can arrive already parsed as a number.
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.length > 0 ? value : "all";
}

export const Route = createFileRoute("/more/explore")({
  validateSearch: (search: Record<string, unknown>) => ({
    program: coerce(search["program"]),
    batch: coerce(search["batch"]),
    section: coerce(search["section"]),
    day: coerce(search["day"]),
    show: Number(search["show"]) > 0 ? Number(search["show"]) : PAGE_SIZE,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/explore" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    // Canonical stays on the base URL regardless of active filters, since
    // filters are represented as URL search params, not distinct pages.
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/explore" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: ExplorePage,
});

function ExplorePage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const sessions = data.timetable.sessions;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const filter = useMemo<ExploreFilter>(
    () => ({
      program: search.program as ExploreFilter["program"],
      batch: search.batch,
      section: search.section,
      day: search.day as ExploreFilter["day"],
    }),
    [search.program, search.batch, search.section, search.day],
  );
  const visible = search.show;

  // Changing a filter restarts paging so the list never jumps to a huge page.
  const update = (patch: Partial<ExploreFilter>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch, show: PAGE_SIZE }) });
  };
  const showMore = () => {
    void navigate({ search: (prev) => ({ ...prev, show: prev.show + PAGE_SIZE }) });
  };

  // Only offer options that actually exist for the current program/batch choice.
  const available = useMemo(() => {
    const batches = new Set<string>();
    const sections = new Set<string>();
    for (const session of sessions) {
      const info = describeSection(session.sectionId);
      if (filter.program !== "all" && info.program !== filter.program) continue;
      if (info.batch) batches.add(info.batch);
      if (filter.batch !== "all" && info.batch !== filter.batch) continue;
      if (info.section) sections.add(info.section);
    }
    return { batches, sections };
  }, [sessions, filter.program, filter.batch]);

  const results = useMemo(
    () => (isExploreFilterEmpty(filter) ? [] : filterSessions(sessions, filter)),
    [sessions, filter],
  );
  const shown = results.slice(0, visible);
  const grouped = useMemo(() => groupSessionsByDay(shown), [shown]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="All Classes"
        description="Browse the timetable outside your own section. Choose at least one filter to see classes."
      />

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Class filters</legend>
        <SelectField
          label="Program"
          value={filter.program === "all" ? "" : filter.program}
          onChange={(value) =>
            update({
              program: (value || "all") as ExploreFilter["program"],
              batch: "all",
              section: "all",
            })
          }
          options={PROGRAMS.map((program) => ({ value: program, label: program }))}
          placeholder="All programs"
        />
        <SelectField
          label="Batch"
          value={filter.batch === "all" ? "" : filter.batch}
          onChange={(value) => update({ batch: value || "all", section: "all" })}
          options={BATCHES.filter((batch) => available.batches.has(batch.id)).map((batch) => ({
            value: batch.id,
            label: batch.label,
          }))}
          placeholder="All batches"
        />
        <SelectField
          label="Section"
          value={filter.section === "all" ? "" : filter.section}
          onChange={(value) => update({ section: value || "all" })}
          options={[...available.sections]
            .sort()
            .map((section) => ({ value: section, label: `Section ${section}` }))}
          placeholder="All sections"
        />
        <SelectField
          label="Day"
          value={filter.day === "all" ? "" : filter.day}
          onChange={(value) => update({ day: (value || "all") as ExploreFilter["day"] })}
          options={WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_LABEL[day] }))}
          placeholder="All days"
        />
      </fieldset>

      {isExploreFilterEmpty(filter) ? (
        <EmptyState
          title="Choose a filter to begin."
          description="Pick a program, batch, section or day. Classes appear here once you narrow the timetable down."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No classes match these filters."
          description="Try a different program, batch, section or day."
        />
      ) : (
        <div className="space-y-5">
          <p className="text-[13px] text-muted-foreground">
            Showing {shown.length} of {results.length} {results.length === 1 ? "class" : "classes"}
          </p>
          {[...grouped.entries()].map(([day, daySessions]) => (
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
          ))}
          {results.length > shown.length ? (
            <button
              type="button"
              onClick={showMore}
              className="min-h-12 w-full rounded-lg border border-border bg-card text-[15px] font-medium text-foreground transition-colors hover:bg-surface-subtle"
            >
              Show {Math.min(PAGE_SIZE, results.length - shown.length)} more
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
