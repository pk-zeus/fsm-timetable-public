import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";

const TITLE = "About · FSM Timetable";
const DESCRIPTION =
  "Who built FSM Timetable and why: a student-made tool that turns the Fall 2026 School of Management spreadsheet into a fast, readable schedule, plus how to report issues.";

export const Route = createFileRoute("/more/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/about" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <PageHeader title="About" />
      <div className="space-y-4 rounded-lg border border-border bg-card px-4 py-4 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          A dedicated platform for FAST students to access their timetable quickly and clearly,
          without navigating a cluttered spreadsheet.
        </p>
        <p>
          Timetable information is organized from the Fall 2026 School of Management spreadsheet link into a clear, student-friendly format for
          faster and easier access.
        </p>
        <p>
          Encountered a bug or something that doesn&apos;t look right? Please report it at{" "}
          <a
            href="mailto:wamizphantom@gmail.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            wamizphantom@gmail.com
          </a>
          .
        </p>
        <div className="border-t border-border pt-3 text-sm">
          <p className="text-foreground">Connect with the founder</p>
          <a
            href="https://www.linkedin.com/in/wamiz-rehman-266b8728b/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block underline underline-offset-4 hover:text-foreground"
          >
            LinkedIn →
          </a>
        </div>
      </div>
    </div>
  );
}
