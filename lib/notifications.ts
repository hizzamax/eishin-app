import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { EVENTS } from '@/data/seed';

/**
 * ローカル通知（フェーズ3）。
 * リモートのプッシュ通知はサーバーとアカウントが必要なため対象外とし、
 * 端末内で完結するローカル通知で、課題期限・行事・時間割変更を知らせる。
 *
 * 注意：Expo Go（Android）は SDK 53 以降 expo-notifications が動作しないため、
 * 通知が実際に届くのは開発ビルド／製品版のみ。Expo Go では何もせず終了する。
 */

export type NotifSettings = {
  enabled: boolean;
};

const SETTINGS_KEY = 'eishin.notifsettings.v1';
export const DEFAULT_NOTIF_SETTINGS: NotifSettings = { enabled: false };

const ASSIGNMENTS_KEY = 'eishin.assignments.v1';
const EXCEPTIONS_KEY = 'eishin.exceptions.v1';
const PERSONAL_EVENTS_KEY = 'eishin.events.v1';

/** Expo Go では通知が動作しない（開発ビルド／製品版でのみ有効） */
export function notificationsRuntimeSupported(): boolean {
  return Constants.executionEnvironment !== 'storeClient';
}

export function setupNotificationHandler(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Expo Go など未対応環境では無視する
  }
}

export async function loadNotifSettings(): Promise<NotifSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIF_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotifSettings>;
    return { enabled: parsed.enabled === true };
  } catch {
    return DEFAULT_NOTIF_SETTINGS;
  }
}

export async function saveNotifSettings(settings: NotifSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsRuntimeSupported()) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

// --- スケジュール同期 ---

type AssignmentLike = { id: string; title: string; subject: string; dueDate: string; status: string };
type ExceptionLike = { id: string; date: string; periodLabel: string; subject: string | null; note: string };
type PersonalLike = { id: string; date: string; time: string; title: string; place: string };

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function at(dateKey: string, hour: number, minute: number): Date {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

type Candidate = { date: Date; title: string; body: string };

export type SyncResult = { scheduled: number; reason: 'ok' | 'disabled' | 'expo-go' | 'no-permission' | 'error' };

/**
 * 現在のデータ内容に合わせて、予約済みローカル通知を組み直す。
 * 変更されたデータ種別は引数で受け取り、それ以外は保存済みデータを読み直す
 * （呼び出し側の保存が終わっていない場合の取り違えを防ぐため）。
 */
export async function syncNotifications(
  update: { assignments?: AssignmentLike[]; exceptions?: ExceptionLike[]; personalEvents?: PersonalLike[] } = {},
): Promise<SyncResult> {
  try {
    const settings = await loadNotifSettings();
    if (!settings.enabled) return { scheduled: 0, reason: 'disabled' };
    if (!notificationsRuntimeSupported()) return { scheduled: 0, reason: 'expo-go' };
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return { scheduled: 0, reason: 'no-permission' };

    const assignments = update.assignments ?? (await readList<AssignmentLike>(ASSIGNMENTS_KEY));
    const exceptions = update.exceptions ?? (await readList<ExceptionLike>(EXCEPTIONS_KEY));
    const personalEvents = update.personalEvents ?? (await readList<PersonalLike>(PERSONAL_EVENTS_KEY));

    const now = new Date();
    const candidates: Candidate[] = [];

    for (const a of assignments) {
      if (a.status === 'done') continue;
      const label = a.subject ? `${a.subject}：${a.title}` : a.title;
      candidates.push({ date: at(shiftDateKey(a.dueDate, -1), 20, 0), title: '課題の期限は明日です', body: label });
      candidates.push({ date: at(a.dueDate, 8, 0), title: '課題の期限は今日です', body: label });
    }

    for (const e of EVENTS) {
      candidates.push({
        date: at(shiftDateKey(e.date, -1), 18, 0),
        title: '明日の予定',
        body: `${e.title}${e.time ? ` ${e.time}` : ''}${e.place ? ` ・ ${e.place}` : ''}`,
      });
    }
    for (const e of personalEvents) {
      candidates.push({
        date: at(shiftDateKey(e.date, -1), 18, 0),
        title: '明日の予定',
        body: `${e.title}${e.time ? ` ${e.time}` : ''}${e.place ? ` ・ ${e.place}` : ''}`,
      });
    }

    for (const ex of exceptions) {
      candidates.push({
        date: at(shiftDateKey(ex.date, -1), 20, 0),
        title: '明日の時間割変更',
        body: (() => {
          const d = new Date(`${ex.date}T00:00:00`);
          return `${d.getMonth() + 1}月${d.getDate()}日 ${ex.periodLabel}：${ex.subject === null ? '休講' : ex.subject}`;
        })(),
      });
    }

    const future = candidates
      .filter((c) => c.date.getTime() > now.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 60); // iOS の予約上限（64件）に余裕を持たせる

    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const c of future) {
      await Notifications.scheduleNotificationAsync({
        content: { title: c.title, body: c.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: c.date },
      });
    }
    return { scheduled: future.length, reason: 'ok' };
  } catch {
    return { scheduled: 0, reason: 'error' };
  }
}

/** その場で1件通知する（時間割変更の登録時、テスト通知など） */
export async function notifyNow(title: string, body: string): Promise<boolean> {
  if (!notificationsRuntimeSupported()) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!notificationsRuntimeSupported()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // 未対応環境では無視する
  }
}
