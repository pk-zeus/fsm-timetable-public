import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimetableSelection } from "@/lib/section-store";
import { type RepeatCourseOffering } from "@/lib/timetable/repeat-courses";
import { formatTime } from "@/lib/timetable/schedule";

export function RepeatCourses({ offerings }: { offerings: RepeatCourseOffering[] }) {
  const { repeatCourses, addRepeatCourse, removeRepeatCourse } = useTimetableSelection();
  const [adding, setAdding] = useState(false);
  const [offeringId, setOfferingId] = useState("");
  const [section, setSection] = useState("");

  const offering = offerings.find((item) => item.id === offeringId);

  function chooseOffering(value: string) {
    const nextOffering = offerings.find((item) => item.id === value);
    setOfferingId(value);
    setSection(nextOffering?.availableSections[0] ?? "");
  }

  function addCourse() {
    if (!offeringId || !section) return;
    addRepeatCourse({ offeringId, section });
    setOfferingId("");
    setSection("");
    setAdding(false);
  }

  return (
    <section
      className="space-y-3 border-t border-border pt-4"
      aria-labelledby="repeat-courses-title"
    >
      <div>
        <h2
          id="repeat-courses-title"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Repeat courses
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add offerings alongside your normal timetable.
        </p>
      </div>

      {repeatCourses.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {repeatCourses.map((selected) => {
            const item = offerings.find((offeringItem) => offeringItem.id === selected.offeringId);
            return item ? (
              <RepeatCourseRow
                key={selected.offeringId}
                offering={item}
                section={selected.section}
                onRemove={() => removeRepeatCourse(selected.offeringId)}
              />
            ) : null;
          })}
        </ul>
      ) : null}

      {adding ? (
        <div className="space-y-3 rounded-md border border-border bg-surface-subtle p-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Course</span>
            <select
              value={offeringId}
              onChange={(event) => chooseOffering(event.target.value)}
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
            >
              <option value="">Select a repeat course</option>
              {offerings
                .filter(
                  (item) => !repeatCourses.some((selected) => selected.offeringId === item.id),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {[item.courseTitle, item.courseCode, item.sectionId]
                      .filter(Boolean)
                      .join(" · ")}
                  </option>
                ))}
            </select>
          </label>
          {offering ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Available section
              </span>
              <select
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
              >
                {offering.availableSections.map((item) => (
                  <option key={item} value={item}>
                    Section {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" disabled={!offeringId} onClick={addCourse}>
              Add course
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setAdding(false);
                setOfferingId("");
                setSection("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => setAdding(true)}
          disabled={repeatCourses.length === offerings.length}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add repeat course
        </Button>
      )}
    </section>
  );
}

function RepeatCourseRow({
  offering,
  section,
  onRemove,
}: {
  offering: RepeatCourseOffering;
  section: string;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-snug text-foreground">
          {offering.courseTitle}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Section {section}
          {offering.courseCode ? ` · ${offering.courseCode}` : ""}
        </p>
        <ul className="mt-1 space-y-0.5">
          {offering.meetings.map((meeting) => (
            <li key={meeting.id} className="text-sm leading-relaxed text-muted-foreground">
              {meeting.day[0]?.toUpperCase() + meeting.day.slice(1)} · {formatTime(meeting.start)}
              {meeting.room ? ` · ${meeting.room}` : ""}
              {meeting.teacher ? ` · ${meeting.teacher}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
        aria-label={`Remove ${offering.courseTitle}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
