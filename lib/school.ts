import { EVENTS, PERIODS, SAMPLE_SUBJECTS, WEEKDAYS, type Period, type SchoolEvent, type WeekdayLabel } from '@/data/seed';
import { effectiveSubjects, type SubjectsMap } from '@/lib/subjects';

export function weekdayLabel(date: Date): WeekdayLabel {
  return WEEKDAYS[date.getDay()];
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdayLabel(date)}）`;
}

export function toDateKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function isClassDay(date: Date, classDays: WeekdayLabel[]): boolean {
  return classDays.includes(weekdayLabel(date));
}

/** 指定日の授業（時限＋科目）。科目の配列は1限・2限・3限の順（HRは科目なし）。 */
export type LessonRow = {
  period: Period;
  subject: string | null; // null = 未設定
};

export function lessonsFor(date: Date, classDays: WeekdayLabel[], subjectsMap?: SubjectsMap): LessonRow[] | null {
  if (!isClassDay(date, classDays)) return null;
  const subjects = subjectsMap
    ? effectiveSubjects(subjectsMap, weekdayLabel(date))
    : SAMPLE_SUBJECTS[weekdayLabel(date)];
  return PERIODS.map((period, i) => ({
    period,
    subject: period.label === 'HR' ? null : subjects?.[i - 1] ?? null,
  }));
}

export function hasSampleSubjects(date: Date): boolean {
  return SAMPLE_SUBJECTS[weekdayLabel(date)] !== undefined;
}

export function upcomingEvents(from: Date): SchoolEvent[] {
  const todayKey = toDateKey(from);
  return [...EVENTS]
    .filter((e) => e.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}
