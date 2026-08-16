import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { TimetableSkeleton, TimetableErrorState } from "@/components/states/states";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { useNow } from "@/hooks/use-now";
import { formatRelativeUpdated } from "@/lib/timetable/schedule";

const TITLE = "Changes · FSM Timetable";
const DESCRIPTION =
  "How up to date the School of Management Block A timetable is, and what the official source currently provides.";

export const Route = createFileRoute("/changes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/changes" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/changes" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: ChangesPage,
});

function ChangesPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const now = useNow();
  const updated = new Date(data.timetable.updatedAt);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Changes"
        description="This app always reads the official timetable directly, so what you see is the current version."
      />

      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-[15px] font-medium text-foreground">
          {formatRelativeUpdated(data.timetable.updatedAt, now)}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Read from the official timetable at{" "}
          {updated.toLocaleString("en-US", {
            timeZone: "Asia/Karachi",
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          (Karachi).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-[15px] font-medium text-foreground">Class change history</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          The official timetable is published as a single current version — it does not include a
          record of what changed or when. Rather than guess at differences, this screen shows only
          how recently the timetable was read. If a change is made in the official timetable, it
          appears in Today and Week straight away.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-[15px] font-medium text-foreground">Source check</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {data.validation.stats.sessions} classes and {data.validation.stats.repeatOfferings}{" "}
          repeat offerings were read and checked, with {data.validation.errorCount} validation{" "}
          {data.validation.errorCount === 1 ? "error" : "errors"}. Entries the official timetable
          leaves unclear are left blank instead of being filled in.
        </p>
      </div>
    </div>
  );
}
