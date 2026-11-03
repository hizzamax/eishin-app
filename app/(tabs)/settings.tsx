import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ALL_CLASS_DAY_CANDIDATES, type WeekdayLabel } from '@/data/seed';
import {
  cancelAllNotifications,
  loadNotifSettings,
  notificationsRuntimeSupported,
  notifyNow,
  requestNotificationPermission,
  saveNotifSettings,
  syncNotifications,
} from '@/lib/notifications';
import { loadProfile, saveProfile, type Profile } from '@/lib/profile';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifNote, setNotifNote] = useState('');
  const expoGo = !notificationsRuntimeSupported();

  useEffect(() => {
    loadProfile().then(setProfile);
    loadNotifSettings().then((s) => setNotifEnabled(s.enabled));
  }, []);

  const toggleNotif = async () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    await saveNotifSettings({ enabled: next });
    if (next) {
      if (expoGo) {
        setNotifNote('Expo Goでは通知は動作しません。開発ビルド／製品版で有効になります。');
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotifNote('通知の許可がありませんでした。端末の設定で許可してください。');
        return;
      }
      const res = await syncNotifications({});
      setNotifNote(`通知を有効にしました（${res.scheduled}件を予約）`);
    } else {
      await cancelAllNotifications();
      setNotifNote('通知を無効にしました');
    }
  };

  const sendTest = async () => {
    if (expoGo) {
      setNotifNote('Expo Goではテスト通知も送れません。開発ビルド／製品版でお試しください。');
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
    setSaved(false);
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

  const onSave = async () => {
    await saveProfile(profile);
    setSaved(true);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>プロフィール</Text>
        <Text style={styles.label}>名前（任意）</Text>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(name) => {
            setSaved(false);
            setProfile({ ...profile, name });
          }}
          placeholder="未設定"
          placeholderTextColor={Colors.subText}
        />
        <Text style={styles.label}>クラス</Text>
        <TextInput
          style={styles.input}
          value={profile.className}
          onChangeText={(className) => {
            setSaved(false);
            setProfile({ ...profile, className });
          }}
          placeholder="例：3-A"
          placeholderTextColor={Colors.subText}
        />
        <Text style={styles.label}>コース</Text>
        <TextInput
          style={styles.input}
          value={profile.course}
          onChangeText={(course) => {
            setSaved(false);
            setProfile({ ...profile, course });
          }}
          placeholder="例：探究コース"
          placeholderTextColor={Colors.subText}
        />
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
        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{saved ? '保存しました' : '保存する'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>通知</Text>
        <Text style={styles.note}>
          課題の期限（前日20時・当日8時）、行事・予定（前日18時）、時間割変更（前日20時と登録時）を、この端末のローカル通知で知らせます。
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
        {expoGo && (
          <Text style={styles.note}>
            ※ いまのプレビュー（Expo Go）では通知機能が動作しません。開発ビルド／製品版で有効になります。
          </Text>
        )}
        {notifNote ? <Text style={styles.note}>{notifNote}</Text> : null}
        <Pressable onPress={sendTest} style={styles.ghostButton}>
          <Text style={styles.linkText}>テスト通知を送る</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>コミュニティ・データ</Text>
        <Link href="/community" asChild>
          <Pressable style={styles.rowBetween}>
            <Text style={styles.bodyText}>コミュニティ（みんなの掲示板）</Text>
            <Text style={styles.linkText}>開く</Text>
          </Pressable>
        </Link>
        <Link href="/import" asChild>
          <Pressable style={styles.rowBetween}>
            <Text style={styles.bodyText}>データの取り込み（ICS・CSV）</Text>
            <Text style={styles.linkText}>開く</Text>
          </Pressable>
        </Link>
        <Link href="/announcements" asChild>
          <Pressable style={styles.rowBetween}>
            <Text style={styles.bodyText}>お知らせ</Text>
            <Text style={styles.linkText}>開く</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>アプリ情報</Text>
        <Text style={styles.note}>英心アプリ（非公式） バージョン 1.0.0</Text>
        <Text style={styles.note}>
          このアプリは生徒有志による非公式アプリです。学校公式のものではなく、学校との提携・公式認定を受けたものではありません。
        </Text>
        <Text style={styles.note}>ダークモード・バックアップは今後のアップデートで対応予定です。</Text>
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
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
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
  dayChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  dayChipText: { fontSize: FontSize.body, color: Colors.subText, fontWeight: '600' },
  dayChipTextActive: { color: Colors.accent },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '600' },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  bodyText: { fontSize: FontSize.body, color: Colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleChip: { flex: 0, paddingHorizontal: Spacing.lg },
  linkText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.xs },
});
