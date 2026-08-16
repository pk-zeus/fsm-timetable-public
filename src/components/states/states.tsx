import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";

export function TimetableSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading timetable">
      <div className="h-24 animate-pulse rounded-lg bg-surface-subtle" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-subtle" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-8 text-center">
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function TimetableLockedState() {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-5 text-center transition-[opacity,transform] duration-150">
      <p className="text-[15px] font-medium text-foreground">
        Select your batch, program and section to view the timetable.
      </p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-8 text-center">
      <p className="text-[15px] font-medium text-foreground">Unable to load the timetable.</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Please check your connection and try again.
      </p>
      <Button variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/**
 * Route-level fallback when the timetable source is unreachable or rejected by
 * validation. Students see a plain message and a retry — never the raw error.
 */
export function TimetableErrorState({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <ErrorState
      onRetry={() => {
        void router.invalidate();
        reset();
      }}
    />
  );
}
