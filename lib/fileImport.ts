import { newId } from '@/lib/assignments';
import { isValidDateKey } from '@/lib/assignments';
import { syncNotifications } from '@/lib/notifications';
import { loadPersonalAll, savePersonalAll, type PersonalEvent } from '@/lib/personalEvents';

/**
 * ファイル取り込み（フェーズ4）。
 * ICS（カレンダーファイル）とCSVから予定候補を読み取り、
 * 確認してから「個人の予定」として取り込む（SPEC 6章：取り込み前の確認・承認後の反映）。
 */

export type ImportCandidate = {
  date: string; // "2026-11-10"
  time: string; // "14:00-16:00"（未定なら空文字）
  title: string;
  place: string;
};

/** "2026/11/10" や "2026年11月10日" を "2026-11-10" にそろえる */
export function normalizeDateKey(raw: string): string | null {
  const s = raw.trim();
  if (isValidDateKey(s)) return s;
  const m1 = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (m1) {
    const key = `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
    return isValidDateKey(key) ? key : null;
  }
  const m2 = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (m2) {
    const key = `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
    return isValidDateKey(key) ? key : null;
  }
  return null;
}

// --- ICS ---

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

/** ICSの日付・日時を {date, time} に変換する。Z（UTC）は日本時間に直す。 */
function parseICSDateTime(value: string): { date: string; time: string } | null {
  const v = value.trim();
  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: '' };
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!dt) return null;
  let year = Number(dt[1]);
  let month = Number(dt[2]);
  let day = Number(dt[3]);
  let hour = Number(dt[4]);
  let minute = Number(dt[5]);
  if (dt[7] === 'Z') {
    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute));
    utc.setUTCHours(utc.getUTCHours() + 9); // UTC→JST
    year = utc.getUTCFullYear();
    month = utc.getUTCMonth() + 1;
    day = utc.getUTCDate();
    hour = utc.getUTCHours();
    minute = utc.getUTCMinutes();
  }
  return { date: `${year}-${pad(month)}-${pad(day)}`, time: `${pad(hour)}:${pad(minute)}` };
}

export function parseICS(text: string): { candidates: ImportCandidate[]; skipped: number; recurring: boolean } {
  // 継続行（行頭が空白）を前の行に連結する
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const candidates: ImportCandidate[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const endIdx = block.indexOf('END:VEVENT');
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const props = new Map<string, string>();
    for (const line of body.split(/\r\n|\n|\r/)) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const name = line.slice(0, colon).split(';')[0].toUpperCase();
      props.set(name, line.slice(colon + 1));
    }
    const summary = props.get('SUMMARY');
    const dtstart = props.get('DTSTART');
    if (!summary || !dtstart) {
      skipped++;
      continue;
    }
    const start = parseICSDateTime(dtstart);
    if (!start) {
      skipped++;
      continue;
    }
    let time = start.time;
    const dtend = props.get('DTEND');
    if (dtend && start.time) {
      const end = parseICSDateTime(dtend);
      if (end && end.time) time = `${start.time}-${end.time}`;
    }
    candidates.push({
      date: start.date,
      time,
      title: unescapeICS(summary),
      place: props.get('LOCATION') ? unescapeICS(props.get('LOCATION')!) : '',
    });
  }
  return { candidates, skipped, recurring: text.includes('RRULE') };
}

// --- CSV ---

/** クォート対応の簡易CSVパーサー */
export function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 列の並び：日付, タイトル, 時間, 場所（ヘッダー行は自動で読み飛ばす） */
export function parseScheduleCSV(text: string): { candidates: ImportCandidate[]; skipped: number } {
  const rows = parseCSVRows(text);
  const candidates: ImportCandidate[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (row.every((c) => c.trim() === '')) continue;
    const date = normalizeDateKey(row[0] ?? '');
    const title = (row[1] ?? '').trim();
    if (!date || !title) {
      skipped++; // ヘッダー行もここで読み飛ばされる
      continue;
    }
    candidates.push({
      date,
      time: (row[2] ?? '').trim(),
      title,
      place: (row[3] ?? '').trim(),
    });
  }
  return { candidates, skipped };
}

/** テキストがICSかどうかをざっくり判定する */
export function looksLikeICS(text: string): boolean {
  return text.includes('BEGIN:VCALENDAR') || text.includes('BEGIN:VEVENT');
}

/** 候補を「個人の予定」として取り込む。同じ日付・タイトルのものは重複として除く。 */
export async function importCandidatesAsPersonalEvents(
  candidates: ImportCandidate[],
): Promise<{ added: number; skippedDup: number }> {
  const existing: PersonalEvent[] = await loadPersonalAll();
  const next = [...existing];
  let added = 0;
  let skippedDup = 0;
  for (const c of candidates) {
    const dup = next.some((e) => e.date === c.date && e.title === c.title);
    if (dup) {
      skippedDup++;
      continue;
    }
    next.push({ id: newId(), date: c.date, time: c.time, title: c.title, place: c.place });
    added++;
  }
  if (added > 0) {
    await savePersonalAll(next);
    syncNotifications({ personalEvents: next }).catch(() => {});
  }
  return { added, skippedDup };
}
