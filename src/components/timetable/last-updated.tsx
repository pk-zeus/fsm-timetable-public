import { formatRelativeUpdated } from "@/lib/timetable/schedule";

export function LastUpdated({ iso, now }: { iso: string; now: Date }) {
  return (
    <p className="pt-4 text-center text-[12px] text-muted-foreground">
      {formatRelativeUpdated(iso, now)}
    </p>
  );
}
