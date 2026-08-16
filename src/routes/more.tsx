import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

const TITLE = "More · FSM Timetable";
const DESCRIPTION =
  "Clash Finder, Available Rooms, settings and information about the Block A timetable utility.";

const CANONICAL_URL = "https://fsm-timetable.lovable.app/more";

export const Route = createFileRoute("/more")({
  head: ({ matches }) => {
    // more.tsx is both the /more hub page and the layout for /more/*.
    // Head functions run for every matched ancestor, and TanStack Router
    // only dedupes <link> tags by exact equality (not by `rel`), so a
    // canonical defined here would render alongside each child route's own
    // canonical instead of being replaced by it. Only attach one when this
    // route is the deepest match — i.e. the actual /more page.
    const isLeaf = !matches.some(
      (m) => (m.routeId as string) !== "/more" && (m.routeId as string).startsWith("/more/"),
    );
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        ...(isLeaf
          ? [
              { property: "og:url", content: CANONICAL_URL },
              { name: "twitter:title", content: TITLE },
              { name: "twitter:description", content: DESCRIPTION },
            ]
          : []),
      ],
      links: isLeaf ? [{ rel: "canonical", href: CANONICAL_URL }] : [],
    };
  },
  component: MorePage,
});

const ITEMS = [
  { to: "/more/explore", label: "All Classes", hint: "Browse beyond your own section" },
  { to: "/more/teachers", label: "Teacher Finder", hint: "See what an instructor teaches" },
  { to: "/more/clash", label: "Clash Finder", hint: "Check your timetable for overlaps" },
  { to: "/more/rooms", label: "Available Rooms", hint: "Rooms with no scheduled class" },
  { to: "/more/share", label: "Share & Export", hint: "Deep link, printable PDF, calendar file" },
  { to: "/more/settings", label: "Settings", hint: "Section and preferences" },
  { to: "/more/about", label: "About", hint: "Purpose and app information" },
] as const;

function MorePage() {
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId !== "/more" && m.routeId.startsWith("/more/"));

  if (isChild) return <Outlet />;

  return (
    <div>
      <PageHeader title="More" />
      <ul className="rounded-lg border border-border bg-card">
        {ITEMS.map((item) => (
          <li key={item.to} className="border-b border-border last:border-b-0">
            <Link
              to={item.to}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-foreground">{item.label}</span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {item.hint}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
