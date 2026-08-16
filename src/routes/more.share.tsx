import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarPlus, Check, Copy, Printer, Share2 } from "lucide-react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { useTimetableSelection } from "@/lib/section-store";
import { sectionIdForSelection } from "@/lib/timetable/selection";
import { toRepeatCourseOfferings } from "@/lib/timetable/repeat-courses";
import { buildStudentWeek } from "@/lib/timetable/student-timetable";
import { buildTimetableIcs } from "@/lib/timetable/ics";
import { shareUrl } from "@/lib/timetable/share-link";
import { PageHeader } from "@/components/layout/page-header";
import {
  TimetableLockedState,
  TimetableSkeleton,
  TimetableErrorState,
} from "@/components/states/states";

const TITLE = "Share & Export · FSM Timetable";
const DESCRIPTION =
  "Share your section as a link, save a printable PDF, or add your classes to any calendar app.";

export const Route = createFileRoute("/more/share")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/share" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/share" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: SharePage,
});

function SharePage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const selection = useTimetableSelection();
  const sectionId = sectionIdForSelection(selection);
  const [copied, setCopied] = useState(false);

  const offerings = useMemo(
    () => toRepeatCourseOfferings(data.repeatOfferings),
    [data.repeatOfferings],
  );

  const link = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return shareUrl(
      {
        batchId: selection.batchId,
        program: selection.program,
        section: selection.section,
        studentType: selection.studentType,
        repeatCourses: selection.repeatCourses,
      },
      origin,
    );
  }, [selection]);

  if (!selection.isComplete || !sectionId) {
    return (
      <div className="space-y-5">
        <PageHeader title="Share & Export" description={DESCRIPTION} />
        <TimetableLockedState />
      </div>
    );
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this link", link);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onShare = async () => {
    if (!navigator.share) return onCopy();
    try {
      await navigator.share({ title: "FSM Timetable Fall 2026", url: link });
    } catch {
      // Sharing cancelled — nothing to do.
    }
  };

  const onDownloadIcs = () => {
    const sessions = buildStudentWeek({
      timetable: data.timetable,
      offerings,
      sectionId,
      studentType: selection.studentType,
      repeatCourses: selection.repeatCourses,
    });
    const ics = buildTimetableIcs({
      sessions,
      now: new Date(),
      calendarName: `FSM Timetable Fall 2026 · ${sectionId}`,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fsm-timetable-${sectionId.toLowerCase()}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Share & Export" description={DESCRIPTION} />

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-[15px] font-medium text-foreground">Share your timetable link</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Opening this link sets batch, program, section and repeater choices automatically.
        </p>
        <p className="mt-3 break-all rounded-md bg-surface-subtle px-3 py-2 font-mono text-[12px] text-muted-foreground">
          {link}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-[15px] font-medium text-foreground">Printable PDF</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Opens a clean one-page week view and starts your browser’s print dialog — choose “Save as
          PDF”.
        </p>
        <Link
          to="/print"
          search={{ auto: true }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Link>
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-[15px] font-medium text-foreground">Calendar export (.ics)</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Adds each class as a weekly repeating event for 16 weeks. Times are campus time
          (Asia/Karachi).
        </p>
        <button
          type="button"
          onClick={onDownloadIcs}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Download .ics
        </button>
      </section>
    </div>
  );
}
