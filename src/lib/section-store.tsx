import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  BatchId,
  Program,
  SectionLabel,
  StudentType,
  TimetableSelection,
} from "@/lib/timetable/selection";
import type { RepeatCourseSelection } from "@/lib/timetable/repeat-courses";
import { parseShareParams } from "@/lib/timetable/share-link";

const STORAGE_KEY = "som-block-a:selection";

type TimetableSelectionContextValue = TimetableSelection & {
  studentType: StudentType;
  repeatCourses: RepeatCourseSelection[];
  isComplete: boolean;
  setBatchId: (id: BatchId | null) => void;
  setProgram: (program: Program | null) => void;
  setSection: (section: SectionLabel | null) => void;
  setStudentType: (type: StudentType) => void;
  addRepeatCourse: (selection: RepeatCourseSelection) => void;
  removeRepeatCourse: (offeringId: string) => void;
};

const SelectionContext = createContext<TimetableSelectionContextValue | null>(null);

export function SectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<TimetableSelection>({
    batchId: null,
    program: null,
    section: null,
  });
  const [studentType, setStudentTypeState] = useState<StudentType>("regular");
  const [repeatCourses, setRepeatCourses] = useState<RepeatCourseSelection[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<{
          selection: TimetableSelection;
          studentType: StudentType;
          repeatCourses: RepeatCourseSelection[];
        }>;
        if (parsed.selection) setSelection(parsed.selection);
        if (parsed.studentType === "regular" || parsed.studentType === "repeater") {
          setStudentTypeState(parsed.studentType);
        }
        if (Array.isArray(parsed.repeatCourses)) setRepeatCourses(parsed.repeatCourses);
      }
    } catch {
      // Invalid local preferences should never prevent the timetable from loading.
    } finally {
      // Must run on every path, otherwise a first-time visitor never saves anything.
      setHydrated(true);
    }
  }, []);

  // A shared deep link always wins over locally saved preferences.
  useEffect(() => {
    const shared = parseShareParams(window.location.search);
    if (!shared) return;
    setSelection((current) => ({
      batchId: shared.batchId ?? current.batchId,
      program: shared.program ?? current.program,
      section: shared.section ?? current.section,
    }));
    if (shared.studentType) setStudentTypeState(shared.studentType);
    if (shared.repeatCourses) setRepeatCourses(shared.repeatCourses);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ selection, studentType, repeatCourses }),
      );
    } catch {
      // Storage can be unavailable (private mode); the app still works in-session.
    }
  }, [hydrated, selection, studentType, repeatCourses]);

  const setBatchId = useCallback((batchId: BatchId | null) => {
    setSelection({ batchId, program: null, section: null });
  }, []);
  const setProgram = useCallback((program: Program | null) => {
    setSelection((current) => ({ ...current, program, section: null }));
  }, []);
  const setSection = useCallback((section: SectionLabel | null) => {
    setSelection((current) => ({ ...current, section }));
  }, []);
  const setStudentType = useCallback((type: StudentType) => {
    setStudentTypeState(type);
  }, []);
  const addRepeatCourse = useCallback((course: RepeatCourseSelection) => {
    setRepeatCourses((current) =>
      current.some((item) => item.offeringId === course.offeringId)
        ? current
        : [...current, course],
    );
  }, []);
  const removeRepeatCourse = useCallback((offeringId: string) => {
    setRepeatCourses((current) => current.filter((item) => item.offeringId !== offeringId));
  }, []);

  const value = useMemo(
    () => ({
      ...selection,
      studentType,
      repeatCourses,
      isComplete: Boolean(selection.batchId && selection.program && selection.section),
      setBatchId,
      setProgram,
      setSection,
      setStudentType,
      addRepeatCourse,
      removeRepeatCourse,
    }),
    [
      selection,
      studentType,
      repeatCourses,
      setBatchId,
      setProgram,
      setSection,
      setStudentType,
      addRepeatCourse,
      removeRepeatCourse,
    ],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useTimetableSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("useTimetableSelection must be used inside SectionProvider");
  return context;
}

/** Compatibility helper for secondary routes that only need the selected section label. */
export function useSelectedSection() {
  const selection = useTimetableSelection();
  return { sectionId: selection.section, setSectionId: selection.setSection };
}
