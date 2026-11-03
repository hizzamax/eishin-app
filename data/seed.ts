/**
 * 初期データ（data.json の内容をそのまま投入）
 * 確認済みの実データのみ。科目は週ごとに変わるためサンプル扱い。
 */

export type Period = {
  label: string;
  start: string; // "13:30"
  end: string; // "13:45"
};

export type SchoolEvent = {
  date: string; // "2026-11-04"
  time: string; // "16:45-17:30"（未定のときは空文字）
  title: string;
  place: string;
  kind: 'event' | 'prep' | 'school';
};

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export type WeekdayLabel = (typeof WEEKDAYS)[number];

/** 授業がある曜日の候補（設定で変更できる） */
export const ALL_CLASS_DAY_CANDIDATES: WeekdayLabel[] = ['月', '火', '水', '木', '金', '土'];

export const DEFAULT_PROFILE = {
  name: '',
  className: '3-A',
  course: '探究コース',
  classDays: ['月', '水', '金'] as WeekdayLabel[],
};

export const PERIODS: Period[] = [
  { label: 'HR', start: '13:30', end: '13:45' },
  { label: '1限', start: '13:45', end: '14:30' },
  { label: '2限', start: '14:40', end: '15:25' },
  { label: '3限', start: '15:35', end: '16:20' },
];

/**
 * 曜日ごとの科目サンプル（data.json の sampleSubjects）。
 * 実際の科目は週ごとに変わるため、画面では「サンプル」と明示する。
 * キーがない曜日は「未設定」として扱う（推測で作らない）。
 */
export const SAMPLE_SUBJECTS: Partial<Record<WeekdayLabel, string[]>> = {
  水: ['英語コミュニケーションII', '数学II', '体育'],
  金: ['世界史', '化学基礎', '美術'],
};

/** 火・木は自由登校日（通常授業なし） */
export const FREE_DAYS_NOTE = '火・木は自由登校日（通常授業なし）';

export const EVENTS: SchoolEvent[] = [
  { date: '2026-11-04', time: '16:45-17:30', title: 'オープンキャンパス実行委員会', place: '1-C教室', kind: 'event' },
  { date: '2026-11-05', time: '14:00-', title: '防災フェス最終準備', place: '', kind: 'prep' },
  { date: '2026-11-07', time: '', title: '防災フェス', place: '', kind: 'school' },
];
