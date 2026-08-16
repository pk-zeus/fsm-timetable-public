import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { timetableQueryOptions } from "@/lib/timetable/source";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TimetableSkeleton, TimetableErrorState } from "@/components/states/states";
import { DayNavigator } from "@/components/timetable/day-navigator";
import { SelectField } from "@/components/section/section-selector";
import { useNow } from "@/hooks/use-now";
import { weekdayOf, formatTime } from "@/lib/timetable/schedule";
import { WEEKDAYS, type Weekday } from "@/lib/timetable/types";
import { allScheduledSessions } from "@/lib/timetable/directory";
import { buildRoomIndex, buildTimeSlots, roomsFreeInTimetable } from "@/lib/timetable/rooms";

const TITLE = "Available Rooms · FSM Timetable";
const DESCRIPTION =
  "Block A rooms with no class scheduled in the timetable for a chosen day and period. Unscheduled use may still occur.";

export const Route = createFileRoute("/more/rooms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fsm-timetable.lovable.app/more/rooms" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://fsm-timetable.lovable.app/more/rooms" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timetableQueryOptions),
  pendingComponent: TimetableSkeleton,
  errorComponent: ({ reset }) => <TimetableErrorState reset={reset} />,
  component: RoomsPage,
});

function RoomsPage() {
  const { data } = useSuspenseQuery(timetableQueryOptions);
  const now = useNow();
  const today = weekdayOf(now);
  const sessions = useMemo(() => allScheduledSessions(data), [data]);
  const slots = useMemo(() => buildTimeSlots(sessions), [sessions]);
  const totalRooms = useMemo(() => buildRoomIndex(sessions).length, [sessions]);

  const [day, setDay] = useState<Weekday>(WEEKDAYS.includes(today) ? today : "mon");
  const [slotKey, setSlotKey] = useState<string>(() => {
    const first = slots[0];
    return first ? `${first.start}-${first.end}` : "";
  });
  const slot = slots.find((item) => `${item.start}-${item.end}` === slotKey) ?? slots[0];

  const free = useMemo(
    () => (slot ? roomsFreeInTimetable(sessions, day, slot) : []),
    [sessions, day, slot],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Available Rooms"
        description="Rooms with no class scheduled in the timetable for the day and period you choose."
      />

      <DayNavigator value={day} onChange={setDay} today={today} />

      <SelectField
        label="Period"
        value={slotKey}
        onChange={setSlotKey}
        options={slots.map((item) => ({
          value: `${item.start}-${item.end}`,
          label: `${formatTime(item.start)} – ${formatTime(item.end)}`,
        }))}
        placeholder="Select a period"
      />

      {!slot ? (
        <EmptyState title="No class periods found in the timetable." />
      ) : free.length === 0 ? (
        <EmptyState
          title="Every room has a scheduled class in this period."
          description="Try another period or day."
        />
      ) : (
        <section aria-label="Rooms available according to the timetable">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available according to the timetable · {free.length} of {totalRooms}
          </h2>
          <ul className="rounded-lg border border-border bg-card">
            {free.map((room) => (
              <li
                key={room.key}
                className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-3 text-[15px] text-foreground last:border-b-0"
              >
                <span>{room.label}</span>
                <span className="text-[13px] tabular-nums text-muted-foreground">
                  {formatTime(slot.start)} – {formatTime(slot.end)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-label="What this list means"
        className="rounded-lg border border-border bg-surface-subtle px-4 py-3.5"
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          What this list means
        </h2>
        <dl className="mt-2 space-y-2 text-[13px] leading-relaxed">
          <div>
            <dt className="font-medium text-foreground">Listed here</dt>
            <dd className="text-muted-foreground">
              No class is scheduled in this room for this period in the official timetable.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Not listed</dt>
            <dd className="text-muted-foreground">
              A scheduled class overlaps this period in that room.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Not a guarantee</dt>
            <dd className="text-muted-foreground">
              This is a timetable check, not a live room booking. Makeup classes, exams, society
              events, meetings and other unscheduled use are not in the timetable, so a room listed
              here may still be occupied. Always check the room in person.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
