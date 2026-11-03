import type { WeekdayLabel } from '@/data/seed';
import { newId } from '@/lib/assignments';
import { loadExceptionsAll, saveExceptionsAll, type TimetableException } from '@/lib/exceptions';
import { syncNotifications } from '@/lib/notifications';
import { loadProfile, saveProfile } from '@/lib/profile';
import { loadZemiAll, saveZemiAll, type ZemiEntry } from '@/lib/zemi';

/**
 * 時間割の共有（フェーズ3）。
 * アカウントやサーバーを使わず、端末同士で直接渡せる形にする。
 * 共有コード（文字列）と、そのコードをそのまま入れたQRコードの2通り。
 *
 * 共有されるもの：クラス・コース・授業曜日・ゼミ・時間割変更（例外）
 * 共有されないもの：名前・個人的な予定・課題（個人情報のため）
 */

const CODE_PREFIX = 'EISHIN1.';

export type SharePayload = {
  v: 1;
  kind: 'eishin-timetable-share';
  exportedAt: string;
  profile: { className: string; course: string; classDays: WeekdayLabel[] };
  zemi: { name: string; weekday: WeekdayLabel; start: string; end: string; place: string }[];
  exceptions: { date: string; periodLabel: string; subject: string | null; note: string }[];
};

// --- UTF-8 対応 Base64url（Hermes でも動く純粋実装） ---

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) * 0x400 + (next - 0xdc00));
        i++;
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
      } else {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

function bytesToUtf8(bytes: number[]): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b >= 0xc0 && b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b >= 0xe0 && b < 0xf0) {
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
      i += 3;
    } else {
      const code =
        ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
      const cp = code - 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      i += 4;
    }
  }
  return out;
}

function encodeBase64Url(text: string): string {
  const bytes = utf8Bytes(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 !== undefined) out += B64[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 !== undefined) out += B64[b2 & 0x3f];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(code: string): string {
  const normalized = code.replace(/-/g, '+').replace(/_/g, '/');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of normalized) {
    const val = B64.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytesToUtf8(bytes);
}

// --- 共有コードの生成・取り込み ---

export async function buildSharePayload(): Promise<SharePayload> {
  const profile = await loadProfile();
  const zemi = await loadZemiAll();
  const exceptions = await loadExceptionsAll();
  return {
    v: 1,
    kind: 'eishin-timetable-share',
    exportedAt: new Date().toISOString(),
    profile: { className: profile.className, course: profile.course, classDays: profile.classDays },
    zemi: zemi.map((z) => ({ name: z.name, weekday: z.weekday, start: z.start, end: z.end, place: z.place })),
    exceptions: exceptions.map((e) => ({ date: e.date, periodLabel: e.periodLabel, subject: e.subject, note: e.note })),
  };
}

export async function buildShareCode(): Promise<string> {
  const payload = await buildSharePayload();
  return CODE_PREFIX + encodeBase64Url(JSON.stringify(payload));
}

export function parseShareCode(code: string): SharePayload {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) {
    throw new Error('共有コードの形式が違います');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(trimmed.slice(CODE_PREFIX.length)));
  } catch {
    throw new Error('共有コードを読み取れませんでした');
  }
  const p = parsed as Partial<SharePayload>;
  if (p.kind !== 'eishin-timetable-share' || p.v !== 1 || !p.profile || !Array.isArray(p.zemi) || !Array.isArray(p.exceptions)) {
    throw new Error('共有コードの内容が正しくありません');
  }
  return p as SharePayload;
}

export type ImportResult = {
  zemiAdded: number;
  exceptionsApplied: number;
  className: string;
  course: string;
};

/**
 * 共有コードを取り込む。
 * - プロフィール：クラス・コース・授業曜日のみ反映（名前は上書きしない）
 * - ゼミ：同じ内容がなければ追加
 * - 時間割変更：同じ日・時限があれば上書き、なければ追加
 */
export async function importShareCode(code: string): Promise<ImportResult> {
  const payload = parseShareCode(code);

  const profile = await loadProfile();
  await saveProfile({
    ...profile,
    className: payload.profile.className || profile.className,
    course: payload.profile.course || profile.course,
    classDays:
      Array.isArray(payload.profile.classDays) && payload.profile.classDays.length > 0
        ? payload.profile.classDays
        : profile.classDays,
  });

  const zemiExisting: ZemiEntry[] = await loadZemiAll();
  const zemiNext = [...zemiExisting];
  let zemiAdded = 0;
  for (const z of payload.zemi) {
    if (!z.name || !z.weekday || !z.start || !z.end) continue;
    const dup = zemiNext.some(
      (e) => e.name === z.name && e.weekday === z.weekday && e.start === z.start && e.end === z.end,
    );
    if (!dup) {
      zemiNext.push({ id: newId(), name: z.name, weekday: z.weekday, start: z.start, end: z.end, place: z.place ?? '' });
      zemiAdded++;
    }
  }
  if (zemiAdded > 0) await saveZemiAll(zemiNext);

  const exExisting: TimetableException[] = await loadExceptionsAll();
  const exNext = [...exExisting];
  let exceptionsApplied = 0;
  for (const ex of payload.exceptions) {
    if (!ex.date || !ex.periodLabel) continue;
    const idx = exNext.findIndex((e) => e.date === ex.date && e.periodLabel === ex.periodLabel);
    if (idx >= 0) {
      exNext[idx] = { ...exNext[idx], subject: ex.subject ?? null, note: ex.note ?? '' };
    } else {
      exNext.push({ id: newId(), date: ex.date, periodLabel: ex.periodLabel, subject: ex.subject ?? null, note: ex.note ?? '' });
    }
    exceptionsApplied++;
  }
  if (exceptionsApplied > 0) {
    await saveExceptionsAll(exNext);
    syncNotifications({ exceptions: exNext }).catch(() => {});
  }

  return {
    zemiAdded,
    exceptionsApplied,
    className: payload.profile.className,
    course: payload.profile.course,
  };
}

/** QRコードに収まる目安（これを超える場合はコード共有を使う） */
export const QR_MAX_LENGTH = 1800;
