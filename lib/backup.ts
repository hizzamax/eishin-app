import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncNotifications } from '@/lib/notifications';
import { decodeBase64Url, encodeBase64Url } from '@/lib/share';

/**
 * データのバックアップ・復元（SPEC 3-4）。
 * 端末内の全データ（プロフィール・科目・ゼミ・課題・予定・登校予定・
 * 時間割変更・お知らせ既読・通知設定・取り込み履歴・コミュニティの自分の投稿）を
 * 1つのコードにまとめ、別の端末や再インストール時に復元できる。
 */
const BACKUP_PREFIX = 'EISHIN-BACKUP1.';

const BACKUP_KEYS = [
  'eishin.profile.v1',
  'eishin.subjects.v1',
  'eishin.zemi.v1',
  'eishin.assignments.v1',
  'eishin.attendance.v1',
  'eishin.exceptions.v1',
  'eishin.events.v1',
  'eishin.announcementReads.v1',
  'eishin.notifsettings.v1',
  'eishin.importHistory.v1',
  'eishin.communityLocal.v1',
] as const;

type BackupFile = {
  v: 1;
  kind: 'eishin-backup';
  exportedAt: string;
  data: Record<string, unknown>;
};

export async function createBackupCode(): Promise<string> {
  const pairs = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  const data: Record<string, unknown> = {};
  for (const [key, value] of pairs) {
    if (value == null) continue;
    try {
      data[key] = JSON.parse(value);
    } catch {
      // 壊れたデータはバックアップに含めない
    }
  }
  const file: BackupFile = { v: 1, kind: 'eishin-backup', exportedAt: new Date().toISOString(), data };
  return BACKUP_PREFIX + encodeBase64Url(JSON.stringify(file));
}

export function isBackupCode(text: string): boolean {
  return text.trim().startsWith(BACKUP_PREFIX);
}

/** バックアップコードから復元する。対象キー以外は書き換えない。 */
export async function restoreBackupCode(code: string): Promise<{ restoredKeys: number; exportedAt: string }> {
  const trimmed = code.trim();
  if (!isBackupCode(trimmed)) throw new Error('バックアップコードの形式が違います');
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(decodeBase64Url(trimmed.slice(BACKUP_PREFIX.length))) as BackupFile;
  } catch {
    throw new Error('バックアップコードを読み取れませんでした');
  }
  if (parsed.kind !== 'eishin-backup' || parsed.v !== 1 || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('バックアップの内容が正しくありません');
  }
  const pairs: [string, string][] = [];
  for (const key of BACKUP_KEYS) {
    if (key in parsed.data) pairs.push([key, JSON.stringify(parsed.data[key])]);
  }
  if (pairs.length === 0) throw new Error('復元できるデータがありませんでした');
  // 復元元に無いキーの現データが残らないよう、対象キーを一度すべて消してから書き込む
  await AsyncStorage.multiRemove([...BACKUP_KEYS]);
  await AsyncStorage.multiSet(pairs);
  syncNotifications({}).catch(() => {});
  return { restoredKeys: pairs.length, exportedAt: parsed.exportedAt };
}
