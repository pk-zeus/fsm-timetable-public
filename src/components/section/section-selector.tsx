import { ChevronDown } from "lucide-react";
import { BATCHES, PROGRAMS, SECTIONS } from "@/lib/timetable/selection";
import { useTimetableSelection } from "@/lib/section-store";

export function SectionSelector() {
  const { batchId, program, section, setBatchId, setProgram, setSection } = useTimetableSelection();

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Timetable selection</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          label="Batch"
          value={batchId ?? ""}
          onChange={(value) => setBatchId((value || null) as typeof batchId)}
          options={BATCHES.map((batch) => ({ value: batch.id, label: batch.label }))}
          placeholder="Select batch"
        />
        <SelectField
          label="Program"
          value={program ?? ""}
          onChange={(value) => setProgram((value || null) as typeof program)}
          options={PROGRAMS.map((item) => ({ value: item, label: item }))}
          placeholder="Select program"
          disabled={!batchId}
        />
        <SelectField
          label="Section"
          value={section ?? ""}
          onChange={(value) => setSection((value || null) as typeof section)}
          options={SECTIONS.map((item) => ({ value: item, label: `Section ${item}` }))}
          placeholder="Select section"
          disabled={!program}
        />
      </div>
    </fieldset>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="relative block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-12 w-full appearance-none rounded-md border border-input bg-card px-3 pr-9 text-[15px] font-medium text-foreground shadow-none transition-[border-color,background-color,box-shadow,opacity] duration-150 hover:border-primary/50 focus:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted-foreground disabled:opacity-100"
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-[2.35rem] h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
    </label>
  );
}
