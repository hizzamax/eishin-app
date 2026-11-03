import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { FREE_DAYS_NOTE, PERIODS, SAMPLE_SUBJECTS, WEEKDAYS, type WeekdayLabel } from '@/data/seed';
import { useProfile } from '@/lib/profile';

const DAY_TABS: WeekdayLabel[] = ['月', '火', '水', '木', '金', '土'];

export default function TimetableScreen() {
  const profile = useProfile();
  const today = useMemo(() => WEEKDAYS[new Date().getDay()], []);
  const [selected, setSelected] = useState<WeekdayLabel>(DAY_TABS.includes(today) ? today : '月');

  const classDays = profile?.classDays ?? ['月', '水', '金'];
  const isDay = classDays.includes(selected);
  const subjects = SAMPLE_SUBJECTS[selected];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.dayRow}>
        {DAY_TABS.map((day) => (
          <Pressable
            key={day}
            onPress={() => setSelected(day)}
            style={[styles.dayChip, selected === day && styles.dayChipActive]}>
            <Text style={[styles.dayChipText, selected === day && styles.dayChipTextActive]}>{day}</Text>
          </Pressable>
        ))}
      </View>

      {!isDay ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected}曜日は授業日ではありません</Text>
          <Text style={styles.note}>{FREE_DAYS_NOTE}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected}曜日の時間割</Text>
          {PERIODS.map((period, i) => (
            <View key={period.label} style={styles.row}>
              <Text style={styles.time}>
                {period.start}–{period.end}
              </Text>
              <Text style={styles.label}>{period.label}</Text>
              <Text style={styles.subject}>
                {period.label === 'HR' ? 'ホームルーム' : subjects?.[i - 1] ?? '未設定'}
              </Text>
            </View>
          ))}
          {subjects ? (
            <Text style={styles.note}>※ 科目はサンプルです（週ごとに変わります）</Text>
          ) : (
            <Text style={styles.note}>この曜日の科目はまだ登録されていません。</Text>
          )}
        </View>
      )}

      <Text style={styles.footer}>科目の編集・共有は今後のアップデートで対応予定です。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg },
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  time: { fontSize: FontSize.small, color: Colors.subText, width: 96 },
  label: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text, width: 36 },
  subject: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  note: { fontSize: FontSize.small, color: Colors.subText },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center' },
});
