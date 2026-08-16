import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { SectionSelector } from "@/components/section/section-selector";
import { PageHeader } from "@/components/layout/page-header";
import { TimetableSkeleton, TimetableErrorState } from "@/components/states/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, type ThemeMode } from "@/lib/theme-store";

const TITLE = "Settings · FSM Timetable";
const DESCRIPTION = "Choose your section and review how this Block A timetable utility behaves.";

export const Route = createFileRoute("/more/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/settings" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/settings" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: SettingsPage,
});

function SettingsPage() {
  useSuspenseQuery(timetableQueryOptions);
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />
      <SectionSelector />
      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-[15px] font-medium text-foreground">Appearance</p>
        <div className="mt-3">
          <p className="text-[13px] font-medium text-foreground">Theme</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            Choose how FSM Timetable appears.
          </p>
          <Select value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
            <SelectTrigger className="mt-2 h-11 w-full max-w-[200px]" aria-label="Theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">☀️ Light</SelectItem>
              <SelectItem value="dark">🌙 Dark</SelectItem>
              <SelectItem value="system">⚙️ System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-[15px] font-medium text-foreground">Install on your phone</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Use your browser menu and choose “Add to Home Screen” to open this like an app.
        </p>
      </div>
    </div>
  );
}
