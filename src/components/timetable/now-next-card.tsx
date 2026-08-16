import { Clock, MapPin, User } from "lucide-react";
import {
  formatClassDuration,
  formatDuration,
  formatTime,
  getSessionProgress,
  minutesUntil,
  toMinutes,
} from "@/lib/timetable/schedule";
import type { ClassSession } from "@/lib/timetable/types";
import { useHydrated } from "@/hooks/use-now";

export function NowNextCard({
  current,
  next,
  now,
}: {
  current: ClassSession | null;
  next: ClassSession | null;
  now: Date;
}) {
  const hydrated = useHydrated();

  if (!current && !next) {
    return (
      <section
        aria-label="Class status"
        className="rounded-lg border border-border bg-card px-4 py-4"
      >
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          No more classes
        </p>
        <p className="mt-1.5 text-[17px] font-semibold leading-snug text-foreground">
          You&apos;re done for today.
        </p>
      </section>
    );
  }

  const session = current ?? next!;
  const label = current ? "Current class · Now" : "Next class";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const detail = current
    ? `Ends in ${formatDuration(toMinutes(current.end) - nowMinutes)}`
    : `Starts in ${formatDuration(minutesUntil(next!.start, now))}`;
  const progress = current ? getSessionProgress(current, now) : null;

  return (
    <section
      aria-label="Class status"
      className="rounded-lg border border-border bg-card px-4 py-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
          {current ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 motion-safe:animate-[pulse_1.8s_ease-in-out_infinite]"
              aria-hidden="true"
            />
          ) : null}
          {label}
        </p>
        <p className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          {hydrated ? detail : null}
        </p>
      </div>
      <h2 className="mt-1.5 text-[19px] font-semibold leading-snug tracking-tight text-foreground">
        {session.courseTitle}
      </h2>
      <dl className="mt-2.5 space-y-1 text-[15px] leading-relaxed">
        <Detail label="Time" icon={Clock}>
          <span className="tabular-nums">
            {formatTime(session.start)} – {formatTime(session.end)}
          </span>
          <span className="ml-2 text-[13px] tabular-nums text-muted-foreground/80">
            {formatClassDuration(session.start, session.end)}
          </span>
        </Detail>
        {session.room ? (
          <Detail label="Room" icon={MapPin}>
            {session.room}
          </Detail>
        ) : null}
        {session.teacher ? (
          <Detail label="Teacher" icon={User}>
            {session.teacher}
          </Detail>
        ) : null}
      </dl>

      {progress !== null ? (
        <div
          className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-primary/15"
          role="progressbar"
          aria-label="Class progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      ) : null}
    </section>
  );
}

function Detail({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="flex w-[64px] shrink-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-foreground">{children}</dd>
    </div>
  );
}
