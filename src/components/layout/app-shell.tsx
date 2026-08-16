import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CalendarDays, CalendarRange, Bell, Menu } from "lucide-react";

const NAV = [
  { to: "/", label: "Today", icon: CalendarDays },
  { to: "/week", label: "Week", icon: CalendarRange },
  { to: "/changes", label: "Changes", icon: Bell },
  { to: "/more", label: "More", icon: Menu },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="print:hidden sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-tight text-foreground"
          >
            <img
              src="/fast-university-logo.png"
              alt="FAST University logo"
              className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
            />
            <span className="flex min-w-0 flex-col justify-center leading-tight">
              <span className="block truncate">FSM TIMETABLE</span>
              <span className="block truncate text-[11px] font-normal text-muted-foreground">
                FALL 2026
              </span>
            </span>
          </Link>
          <nav aria-label="Primary" className="hidden shrink-0 items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-5 sm:pb-12">{children}</main>

      <SiteFooter />

      <nav
        aria-label="Primary"
        className="print:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),0.25rem)] sm:hidden"
      >
        <ul className="mx-auto flex max-w-3xl">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors data-[status=active]:font-semibold data-[status=active]:text-primary"
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="print:hidden mx-auto w-full max-w-3xl px-4 pb-28 pt-2 sm:pb-10">
      <div className="border-t border-border pt-4 text-[13px] leading-relaxed text-muted-foreground">
        <p>FAST School of Management · Block A timetable</p>
      </div>
    </footer>
  );
}
