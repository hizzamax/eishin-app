import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

/**
 * お知らせ（フェーズ3）。
 * これはアプリ運営側（生徒有志）からのお知らせであり、学校公式のお知らせではない。
 * 学校共通情報の配信は管理権限とアカウントが必要なため、現段階では
 * アプリに同梱するお知らせ＋既読管理のみを実装する。
 */
export type Announcement = {
  id: string;
  date: string; // "2026-11-03"
  title: string;
  body: string;
  important?: boolean;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'onboarding-20261103',
    date: '2026-11-03',
    title: 'はじめての人向けの案内画面を追加しました',
    body: '初めてアプリを開いたときに、クラス・コース・授業がある曜日・科目を選ぶ案内画面が出るようになりました。最初からサンプルが入っていて自分のデータと間違えることがなくなります。すでに使っている人には表示されません。',
  },
  {
    id: 'polish-20261103',
    date: '2026-11-03',
    title: '見やすさと使いやすさを改善しました',
    body: 'PCで開いたときにスマホ幅で中央に表示されるようになりました。ホームの「直近の時間割変更」と「次の行事・予定」のカードがタップで各画面に移動します。課題の未完了件数バッジ、カレンダーの「今日」ボタンの常時表示、時間割の日曜タブ、設定に「データをすべて削除」を追加しました。文字色も濃くして読みやすくしています。',
  },
  {
    id: 'improvements-20261103',
    date: '2026-11-03',
    title: 'たくさんの改善をしました',
    body: '掲示板の時間割取り込みに確認を追加し、自分のデータを守るようにしました。カレンダーの予定は編集できるようになり、課題はバッジのタップで状態を切り替えられます。学校行事は3月まで入り、バックアップはコードを表示してコピーできるようになりました。Web版では通知が届かないことも明記しました。',
  },
  {
    id: 'picker-update-20261103',
    date: '2026-11-03',
    title: '日付・時刻の入力と登校予定について',
    body: '課題の期限や予定の日付、ゼミの時間が、手入力からタップで選ぶ方式に変わりました。あわせて「登校予定」の機能は終了しました。登校日はこれまで通り、設定した授業曜日をもとにホームとカレンダーに表示されます。',
  },
  {
    id: 'review-fixes-20261103',
    date: '2026-11-03',
    title: '掲示板と全体の使い勝手を改善しました',
    body: '掲示板は投稿一覧が見やすいレイアウトに変わり、種類で絞り込めるようになりました。あわせて課題・カレンダー・登校予定など各画面の細部も見直し、他の画面で変更した内容がタブを開き直したときに反映されるようになりました。',
  },
  {
    id: 'design-refresh',
    date: '2026-11-03',
    title: 'デザインを新しくしました',
    body: '白基調×コーラルオレンジのプレミアムなデザインに刷新しました。ホーム画面は今日の状態がひと目で分かる大きなカードに、掲示板は下のタブに移動しています。',
  },
  {
    id: 'polish-update',
    date: '2026-11-03',
    title: '科目の編集・カレンダーの月表示・バックアップに対応しました',
    body: '時間割タブで曜日ごとの科目を自分の科目に変更できるようになりました（共有にも反映されます）。カレンダーには月間表示がつき、設定からはデータのバックアップが作れます。ホームには次の登校日も表示されます。',
  },
  {
    id: 'phase4-update',
    date: '2026-11-03',
    title: 'コミュニティとファイル取り込みに対応しました',
    body: 'フェーズ4として、ICS・CSVファイルからの予定の取り込み（確認画面と履歴つき）と、コミュニティ（みんなの掲示板）を追加しました。時間割の共有は掲示板経由です。掲示板が全員に公開されるにはサーバーの準備が必要で、それまではこの端末内だけの表示です。',
    important: true,
  },
  {
    id: 'unofficial-notice',
    date: '2026-11-03',
    title: 'このアプリは非公式アプリです',
    body: 'このアプリは生徒有志が作った非公式アプリです。ここに表示されるお知らせはアプリからの案内で、学校公式のお知らせではありません。学校の正式な連絡は、学校からの案内で確認してください。',
    important: true,
  },
  {
    id: 'phase3-update',
    date: '2026-11-03',
    title: '通知と時間割の共有に対応しました',
    body: 'フェーズ3として、課題の期限・行事・時間割変更を知らせるローカル通知に対応しました。時間割の共有は、フェーズ4でコミュニティ（掲示板）経由になりました。通知は設定タブから有効にできます（通知が実際に届くのは開発ビルド／製品版のみで、Expo Goでは動作しません）。',
    important: true,
  },
  {
    id: 'zemi-registration',
    date: '2026-11-03',
    title: 'ゼミの登録について',
    body: 'ゼミの定期スケジュールは公開情報では確認できなかったため、自分のゼミを自分で登録する方式にしています。時間割タブの「ゼミの登録・変更」から登録すると、ホームにも表示されます。',
  },
];

const READS_KEY = 'eishin.announcementReads.v1';

async function loadReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(READS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export type AnnouncementWithRead = Announcement & { read: boolean };

export function useAnnouncements() {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    loadReadIds().then((ids) => {
      setReadIds(ids);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const persist = useCallback((next: string[]) => {
    setReadIds(next);
    AsyncStorage.setItem(READS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const markRead = useCallback(
    (id: string) => {
      if (!readIds.includes(id)) persist([...readIds, id]);
    },
    [readIds, persist],
  );

  const markAllRead = useCallback(() => {
    persist(ANNOUNCEMENTS.map((a) => a.id));
  }, [persist]);

  const items: AnnouncementWithRead[] = ANNOUNCEMENTS.map((a) => ({ ...a, read: readIds.includes(a.id) }));
  const unreadCount = items.filter((a) => !a.read).length;

  return { items, unreadCount, loaded, markRead, markAllRead };
}
