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

export const EVENTS: SchoolEvent[] = [
  { date: '2026-11-04', time: '16:45-17:30', title: 'オープンキャンパス実行委員会', place: '1-C教室', kind: 'event' },
  { date: '2026-11-05', time: '14:00〜', title: '防災フェス最終準備', place: '', kind: 'prep' },
  { date: '2026-11-07', time: '', title: '防災フェス', place: '', kind: 'school' },
  { date: '2026-11-08', time: '', title: '第2回英検（二次）', place: '', kind: 'event' },
  { date: '2026-11-12', time: '', title: '集中⑧', place: '', kind: 'event' },
  { date: '2026-11-13', time: '', title: '第2回数学検定', place: '', kind: 'event' },
  { date: '2026-11-23', time: '', title: '勤労感謝の日', place: '', kind: 'school' },
  { date: '2026-12-14', time: '', title: '補習（AM）・平常授業（PM）', place: '', kind: 'event' },
  { date: '2026-12-15', time: '', title: '補習（AM）・平常授業（PM）', place: '', kind: 'event' },
  { date: '2026-12-16', time: '', title: '補習（AM）・平常授業（PM）', place: '', kind: 'event' },
  { date: '2026-12-17', time: '', title: '補習（AM）・平常授業（PM）', place: '', kind: 'event' },
  { date: '2026-12-18', time: '', title: '補習（AM）・平常授業（PM）', place: '', kind: 'event' },
  { date: '2026-12-19', time: '', title: '特別活動/終業式・スーツ着こなし講座', place: '', kind: 'school' },
  { date: '2026-12-21', time: '', title: '集中⑨', place: '', kind: 'event' },
  { date: '2026-12-22', time: '', title: '集中SC（補習）', place: '', kind: 'event' },
  { date: '2026-12-23', time: '', title: '集中SC（補習）', place: '', kind: 'event' },
  { date: '2026-12-26', time: '', title: '年末閉校日', place: '', kind: 'school' },
  { date: '2027-01-08', time: '', title: '始業式', place: '', kind: 'school' },
  { date: '2027-01-11', time: '', title: '成人の日', place: '', kind: 'school' },
  { date: '2027-01-14', time: '', title: '集中⑩', place: '', kind: 'event' },
  { date: '2027-01-20', time: '', title: '到達度テスト・文章検定', place: '', kind: 'event' },
  { date: '2027-01-25', time: '', title: '後期テスト（3年）', place: '', kind: 'event' },
  { date: '2027-01-27', time: '', title: '後期テスト（3年）', place: '', kind: 'event' },
  { date: '2027-01-29', time: '', title: '後期テスト（3年）', place: '', kind: 'event' },
  { date: '2027-02-01', time: '', title: 'テスト返却（3年）', place: '', kind: 'event' },
  { date: '2027-02-03', time: '', title: 'テスト返却（3年）', place: '', kind: 'event' },
  { date: '2027-02-04', time: '', title: '集中⑪', place: '', kind: 'event' },
  { date: '2027-02-05', time: '', title: 'テスト返却（3年）', place: '', kind: 'event' },
  { date: '2027-02-11', time: '', title: '建国記念の日', place: '', kind: 'school' },
  { date: '2027-02-15', time: '', title: '後期テスト返却・登校日（3年）', place: '', kind: 'event' },
  { date: '2027-02-20', time: '', title: '特別活動/成果発表会', place: '', kind: 'school' },
  { date: '2027-02-23', time: '', title: '天皇誕生日', place: '', kind: 'school' },
  { date: '2027-02-24', time: '', title: '補習（探究）', place: '', kind: 'event' },
  { date: '2027-02-25', time: '', title: '補習（探究）', place: '', kind: 'event' },
  { date: '2027-02-26', time: '', title: '補習（探究）', place: '', kind: 'event' },
  { date: '2027-02-28', time: '', title: '第3回英検（二次）', place: '', kind: 'event' },
  { date: '2027-03-01', time: '', title: '三者懇談', place: '', kind: 'event' },
  { date: '2027-03-02', time: '', title: '三者懇談', place: '', kind: 'event' },
  { date: '2027-03-03', time: '', title: '三者懇談', place: '', kind: 'event' },
  { date: '2027-03-04', time: '', title: '集中⑫・三者懇談', place: '', kind: 'event' },
  { date: '2027-03-05', time: '', title: '三者懇談/登校日（3年）', place: '', kind: 'event' },
  { date: '2027-03-08', time: '', title: '三者懇談', place: '', kind: 'event' },
  { date: '2027-03-09', time: '', title: '三者懇談', place: '', kind: 'event' },
  { date: '2027-03-10', time: '', title: '三者懇談', place: '', kind: 'event' },
  { date: '2027-03-11', time: '', title: '三者懇談・卒業式練習', place: '', kind: 'event' },
  { date: '2027-03-12', time: '', title: '登校日（3年）・三者懇談', place: '', kind: 'event' },
  { date: '2027-03-13', time: '', title: '卒業式（特活）全学年', place: '', kind: 'school' },
  { date: '2027-03-21', time: '', title: '春分の日', place: '', kind: 'school' },
  { date: '2027-03-22', time: '', title: '振替休日', place: '', kind: 'school' },
];
