import { cn } from "@/lib/utils";
import { WEEKDAYS, WEEKDAY_SHORT, type Weekday } from "@/lib/timetable/types";

export function DayNavigator({
  value,
  onChange,
  today,
}: {
  value: Weekday;
  onChange: (day: Weekday) => void;
  today: Weekday;
}) {
  return (
    <div role="tablist" aria-label="Day of week" className="flex gap-2">
      {WEEKDAYS.map((day) => {
        const selected = day === value;
        return (
          <button
            key={day}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(day)}
            className={cn(
              "min-h-11 flex-1 rounded-lg border text-[13px] font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-surface-subtle",
            )}
          >
            {WEEKDAY_SHORT[day]}
            <span className="sr-only">{day === today ? " (today)" : ""}</span>
            {day === today && !selected ? (
              <span
                aria-hidden="true"
                className="mx-auto mt-1 block h-1 w-1 rounded-full bg-primary"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
