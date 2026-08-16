import { MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  campusMinutes,
  formatClassDuration,
  formatTime,
  getSessionProgress,
  toMinutes,
} from "@/lib/timetable/schedule";
import type { ClassSession } from "@/lib/timetable/types";

export function ClassRow({
  session,
  isNow,
  now,
  context,
}: {
  session: ClassSession;
  isNow?: boolean;
  /** Current instant — only needed to drive the live progress bar for the active row. */
  now?: Date | undefined;
  /** Quiet extra line used by discovery screens, e.g. "BBA03A · BBA · Batch 25". */
  context?: string;
}) {
  const isEnded = !isNow && now ? toMinutes(session.end) <= campusMinutes(now) : false;
  const progress = isNow && now ? getSessionProgress(session, now) : null;

  return (
    <li
      className={cn(
        "relative flex gap-4 border-b border-border px-4 py-3.5 transition-[background-color,opacity] duration-150 last:border-b-0",
        isNow && "rounded-md border-b-transparent bg-now-tint",
        isEnded && "opacity-60",
      )}
    >
      {isNow ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary"
        />
      ) : null}

      <div className="w-[86px] shrink-0">
        <div className="whitespace-nowrap text-[15px] font-semibold leading-snug tabular-nums text-foreground">
          {formatTime(session.start)}
        </div>
        <div className="whitespace-nowrap text-[14px] leading-snug tabular-nums text-muted-foreground">
          {formatTime(session.end)}
        </div>
        <div className="mt-1 whitespace-nowrap text-[11px] leading-snug tabular-nums text-muted-foreground/80">
          {formatClassDuration(session.start, session.end)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {isNow ? (
          <span className="mb-0.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 motion-safe:animate-[pulse_1.8s_ease-in-out_infinite]"
            />
            Now
          </span>
        ) : null}
        <p className="text-[16px] font-medium leading-snug text-foreground">
          {session.courseTitle}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-snug text-muted-foreground">
          {session.courseCode ? <span>{session.courseCode}</span> : null}
          {session.room ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
              {session.room}
            </span>
          ) : null}
          {session.teacher ? (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
              {session.teacher}
            </span>
          ) : null}
        </p>
        {context ? <p className="mt-1 text-[13px] text-muted-foreground">{context}</p> : null}
        {session.isRepeat ? (
          <p className="mt-1 text-[12px] font-medium text-primary">Repeat course</p>
        ) : null}

        {progress !== null ? (
          <div
            className="mt-2.5 h-[3px] w-full max-w-[220px] overflow-hidden rounded-full bg-primary/15"
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
      </div>
    </li>
  );
}
