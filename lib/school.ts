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

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 現在時刻の時点で「次の授業」を返す。今日の分がなければ null。 */
export function nextLesson(now: Date, classDays: WeekdayLabel[]): { row: LessonRow; inMinutes: number } | null {
  const rows = lessonsFor(now, classDays);
  if (!rows) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const row of rows) {
    const start = minutesOf(row.period.start);
    if (start > nowMin) return { row, inMinutes: start - nowMin };
  }
  return null;
}

/** 今日以降でいちばん近い行事と、あと何日か。 */
export function nextEvent(from: Date): { event: SchoolEvent; inDays: number } | null {
  const todayKey = toDateKey(from);
  const sorted = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date));
  for (const event of sorted) {
    if (event.date >= todayKey) {
      const target = new Date(`${event.date}T00:00:00`);
      const base = new Date(`${todayKey}T00:00:00`);
      const inDays = Math.round((target.getTime() - base.getTime()) / 86400000);
      return { event, inDays };
    }
  }
  return null;
}

export function upcomingEvents(from: Date): SchoolEvent[] {
  const todayKey = toDateKey(from);
  return [...EVENTS]
    .filter((e) => e.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function eventDateLabel(event: SchoolEvent): string {
  const d = new Date(`${event.date}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
}
