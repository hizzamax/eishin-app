import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ALL_CLASS_DAY_CANDIDATES, type WeekdayLabel } from '@/data/seed';
import { loadProfile, saveProfile, type Profile } from '@/lib/profile';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

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
        <Text style={styles.cardTitle}>アプリ情報</Text>
        <Text style={styles.note}>英心アプリ（非公式） バージョン 1.0.0</Text>
        <Text style={styles.note}>
          このアプリは生徒有志による非公式アプリです。学校公式のものではなく、学校との提携・公式認定を受けたものではありません。
        </Text>
        <Text style={styles.note}>通知・ダークモード・バックアップは今後のアップデートで対応予定です。</Text>
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
});
