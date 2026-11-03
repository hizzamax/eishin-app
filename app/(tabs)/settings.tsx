import { SymbolView } from 'expo-symbols';
import Constants from 'expo-constants';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { createBackupCode } from '@/lib/backup';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ALL_CLASS_DAY_CANDIDATES, type WeekdayLabel } from '@/data/seed';
import {
  cancelAllNotifications,
  loadNotifSettings,
  notificationsIsWeb,
  notificationsRuntimeSupported,
  notifyNow,
  requestNotificationPermission,
  saveNotifSettings,
  syncNotifications,
} from '@/lib/notifications';
import { loadProfile, saveProfile, type Profile } from '@/lib/profile';

const GRADES = ['1', '2', '3'] as const;
const COURSES = ['探究コース', '集中スクーリング'] as const;

function lettersForGrade(grade: string): string[] {
  // 1年はC組まで、2・3年はB組まで
  return grade === '1' ? ['A', 'B', 'C'] : ['A', 'B'];
}

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifNote, setNotifNote] = useState('');
  const notifWeb = notificationsIsWeb();
  const notifUnsupported = !notificationsRuntimeSupported();

  useEffect(() => {
    loadProfile().then(setProfile);
    loadNotifSettings().then((s) => setNotifEnabled(s.enabled));
  }, []);

  // 復元などで他画面からデータが変わった場合、未編集なら開き直したときに読み直す
  useFocusEffect(
    useCallback(() => {
      if (dirtyRef.current) return;
      loadProfile().then(setProfile);
      loadNotifSettings().then((s) => setNotifEnabled(s.enabled));
    }, []),
  );

  const toggleNotif = async () => {
    if (!notifEnabled) {
      // ONにする：未対応環境では状態を変えず、理由だけ伝える
      if (notifUnsupported) {
        setNotifNote(
          notifWeb
            ? 'Web版では通知は届きません。アプリ版（製品版）でお使いください。'
            : 'Expo Goでは通知は動作しません。開発ビルド／製品版で有効になります。',
        );
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        // 許可が取れなかったらONのままにしない（「ONなのに届かない」状態を作らない）
        setNotifEnabled(false);
        await saveNotifSettings({ enabled: false });
        setNotifNote('通知の許可がありませんでした。端末の設定で許可してください。');
        return;
      }
      setNotifEnabled(true);
      await saveNotifSettings({ enabled: true });
      const res = await syncNotifications({});
      setNotifNote(`通知を有効にしました（${res.scheduled}件を予約）`);
    } else {
      setNotifEnabled(false);
      await saveNotifSettings({ enabled: false });
      await cancelAllNotifications();
      setNotifNote('通知を無効にしました');
    }
  };

  const [backupNote, setBackupNote] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const onBackup = async () => {
    try {
      const code = await createBackupCode();
      setBackupCode(code);
      try {
        await Share.share({ message: code });
        setBackupNote('バックアップコードを作成しました。復元は「データの取り込み」画面からできます。コードは他の人に見せないでください（自分のデータが含まれます）。');
      } catch {
        // Webなど共有シートが使えない環境では、コードを画面に表示してコピーしてもらう
        setBackupNote('共有できなかったため、コードを下に表示しています。コピーして安全な場所に保管してください。復元は「データの取り込み」画面からできます。');
      }
    } catch {
      setBackupNote('バックアップを作成できませんでした');
    }
  };

  const sendTest = async () => {
    if (notifUnsupported) {
      setNotifNote(
        notifWeb
          ? 'Web版ではテスト通知も送れません。アプリ版でお試しください。'
          : 'Expo Goではテスト通知も送れません。開発ビルド／製品版でお試しください。',
      );
      return;
    }
    if (!notifEnabled) {
      setNotifNote('通知がOFFです。先に「通知を受け取る」をONにしてください。');
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      setNotifNote('通知の許可がありませんでした。端末の設定で許可してください。');
      return;
    }
    const ok = await notifyNow('テスト通知', '英心アプリ（非公式）の通知テストです。');
    setNotifNote(ok ? 'テスト通知を送りました' : 'テスト通知を送れませんでした');
  };

  if (!profile) {
    return (
      <View style={styles.root}>
        <Text style={styles.note}>読み込み中…</Text>
      </View>
    );
  }

  const toggleDay = (day: WeekdayLabel) => {
    setSaved(false); setDirty(true); dirtyRef.current = true;
    setProfile((p) =>
      p
        ? {
            ...p,
            classDays: p.classDays.includes(day)
              ? p.classDays.filter((d) => d !== day)
              : [...p.classDays, day],
          }
        : p,
    );
  };

  const [saveError, setSaveError] = useState('');
  const onSave = async () => {
    if (profile.classDays.length === 0) {
      setSaveError('授業がある曜日を1日以上選んでください');
      return;
    }
    setSaveError('');
    await saveProfile(profile);
    setSaved(true);
    setDirty(false);
    dirtyRef.current = false;
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <SymbolView name={{ ios: 'person.crop.circle.fill', android: 'person', web: 'person' }} tintColor={Colors.accent} size={18} />
          </View>
          <Text style={styles.cardTitle}>プロフィール</Text>
        </View>
        <Text style={styles.label}>名前（任意）</Text>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(name) => {
            setSaved(false); setDirty(true); dirtyRef.current = true;
            setProfile({ ...profile, name });
          }}
          placeholder="名前（任意）"
          placeholderTextColor={Colors.subText}
        />
        <Text style={styles.label}>クラス（学年・組を選んでください）</Text>
        {(() => {
          const m = profile.className.match(/^([1-3])-([A-C])$/);
          const grade = m?.[1];
          const letter = m?.[2];
          const setGrade = (g: string) => {
            setSaved(false); setDirty(true); dirtyRef.current = true;
            const nextLetter = letter && lettersForGrade(g).includes(letter) ? letter : 'A';
            setProfile({ ...profile, className: `${g}-${nextLetter}` });
          };
          const setLetter = (l: string) => {
            if (!grade) return;
            setSaved(false); setDirty(true); dirtyRef.current = true;
            setProfile({ ...profile, className: `${grade}-${l}` });
          };
          return (
            <>
              <View style={styles.chipRow}>
                {GRADES.map((g) => {
                  const active = grade === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setGrade(g)}
                      style={[styles.optionChip, active && styles.dayChipActive]}>
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{g}年</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.chipRow}>
                {(grade ? lettersForGrade(grade) : ['A', 'B', 'C']).map((l) => {
                  const active = letter === l;
                  return (
                    <Pressable
                      key={l}
                      onPress={() => setLetter(l)}
                      style={[styles.optionChip, active && styles.dayChipActive]}>
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{l}組</Text>
                    </Pressable>
                  );
                })}
              </View>
              {!grade && (
                <Text style={styles.note}>
                  現在の設定「{profile.className || '未設定'}」は一覧にない形式です。学年と組を選ぶと置き換わります。
                </Text>
              )}
            </>
          );
        })()}
        <Text style={styles.label}>コース</Text>
        <View style={styles.chipRow}>
          {(COURSES.includes(profile.course as (typeof COURSES)[number]) || !profile.course
            ? [...COURSES]
            : [profile.course, ...COURSES]
          ).map((c) => {
            const active = profile.course === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  setSaved(false); setDirty(true); dirtyRef.current = true;
                  setProfile({ ...profile, course: c });
                }}
                style={[styles.optionChip, active && styles.dayChipActive]}>
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>授業がある曜日</Text>
        <View style={styles.dayRow}>
          {ALL_CLASS_DAY_CANDIDATES.map((day) => {
            const active = profile.classDays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={[styles.dayChip, active && styles.dayChipActive]}>
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{saved ? '保存しました' : '保存する'}</Text>
        </Pressable>
        {dirty && !saved ? <Text style={styles.note}>未保存の変更があります</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <SymbolView name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} tintColor={Colors.accent} size={18} />
          </View>
          <Text style={styles.cardTitle}>通知</Text>
        </View>
        <Text style={styles.note}>
          課題（前日20時・当日8時）、行事と予定（前日18時）、時間割変更（前日20時）を、この端末の通知で知らせます。
        </Text>
        <View style={styles.rowBetween}>
          <Text style={styles.bodyText}>通知を受け取る</Text>
          <Pressable
            onPress={toggleNotif}
            style={[styles.dayChip, notifEnabled && styles.dayChipActive, styles.toggleChip]}>
            <Text style={[styles.dayChipText, notifEnabled && styles.dayChipTextActive]}>
              {notifEnabled ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>
        {notifUnsupported && (
          <Text style={styles.note}>
            {notifWeb
              ? '※ Web版では通知は届きません。アプリ版（製品版）でのみ使えます。'
              : '※ いまのプレビュー（Expo Go）では通知機能が動作しません。開発ビルド／製品版で有効になります。'}
          </Text>
        )}
        {notifNote ? <Text style={styles.note}>{notifNote}</Text> : null}
        <Pressable onPress={sendTest} style={styles.ghostButton}>
          <Text style={styles.linkText}>テスト通知を送る</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <SymbolView name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }} tintColor={Colors.accent} size={18} />
          </View>
          <Text style={styles.cardTitle}>コミュニティ・データ</Text>
        </View>
        <Link href="/community" asChild>
          <Pressable style={styles.listRow}>
            <Text style={styles.bodyText}>コミュニティ（みんなの掲示板）</Text>
            <Text style={styles.linkText}>›</Text>
          </Pressable>
        </Link>
        <Link href="/import" asChild>
          <Pressable style={styles.listRow}>
            <Text style={styles.bodyText}>データの取り込み（ICS・CSV）</Text>
            <Text style={styles.linkText}>›</Text>
          </Pressable>
        </Link>
        <Link href="/announcements" asChild>
          <Pressable style={styles.listRow}>
            <Text style={styles.bodyText}>お知らせ</Text>
            <Text style={styles.linkText}>›</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <SymbolView name={{ ios: 'externaldrive.fill', android: 'hard_drive', web: 'hard_drive' }} tintColor={Colors.accent} size={18} />
          </View>
          <Text style={styles.cardTitle}>バックアップ</Text>
        </View>
        <Text style={styles.note}>
          プロフィール・科目・ゼミ・課題・予定など、この端末のデータを1つのコードにまとめます。機種変更や再インストールのときに、「データの取り込み」画面から復元できます。
        </Text>
        <Pressable onPress={onBackup} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>バックアップを作成して共有</Text>
        </Pressable>
        {backupNote ? <Text style={styles.note}>{backupNote}</Text> : null}
        {backupCode ? (
          <View style={styles.codeBox}>
            <Text selectable style={styles.codeText}>
              {backupCode}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <SymbolView name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }} tintColor={Colors.accent} size={18} />
          </View>
          <Text style={styles.cardTitle}>アプリ情報</Text>
        </View>
        <Text style={styles.note}>英心アプリ（非公式） バージョン {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <Text style={styles.note}>
          このアプリは生徒有志による非公式アプリです。学校公式のものではなく、学校との提携・公式認定を受けたものではありません。
        </Text>
        <Text style={styles.note}>ダークモードは今後のアップデートで対応予定です。</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: FontSize.small, color: Colors.subText, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  dayRow: { flexDirection: 'row', gap: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  dayChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayChipText: { fontSize: FontSize.body, color: Colors.subText, fontWeight: '600' },
  dayChipTextActive: { color: Colors.white },
  saveButton: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  error: { fontSize: FontSize.small, color: Colors.danger, lineHeight: 20 },
  codeBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.subBackground,
    padding: Spacing.md,
  },
  codeText: { fontSize: FontSize.caption, color: Colors.text },
  bodyText: { fontSize: FontSize.body, color: Colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Link(asChild) の子には配列スタイルを渡せないため、行レイアウトを1つのスタイルに統合している
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleChip: { flex: 0, paddingHorizontal: Spacing.lg },
  linkText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.xs },
});
