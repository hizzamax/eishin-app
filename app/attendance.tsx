import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ATTENDANCE_LABEL, dateLabel, effectiveKind, useAttendance, type AttendanceKind } from '@/lib/attendance';
import { useProfile } from '@/lib/profile';
import { toDateKey } from '@/lib/school';

const KINDS: AttendanceKind[] = ['school', 'home', 'off'];
const DAYS_TO_SHOW = 14;

export default function AttendanceScreen() {
  const profile = useProfile();
  const { map, setFor } = useAttendance();
  const classDays = profile?.classDays ?? ['月', '水', '金'];

  const days = useMemo(() => {
    const list: { key: string; date: Date }[] = [];
    const base = new Date();
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      list.push({ key: toDateKey(d), date: d });
    }
    return list;
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.note}>
        これからの14日間の登校予定です。タップで切り替えると保存されます（個人用の管理で、学校の正式な出席記録ではありません）。
      </Text>
      {days.map(({ key, date }) => {
        const kind = effectiveKind(date, classDays, map);
        const overridden = map[key] !== undefined;
        return (
          <View key={key} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.dateText}>{dateLabel(key)}</Text>
              {overridden && (
                <Pressable onPress={() => setFor(key, null)}>
                  <Text style={styles.reset}>既定に戻す</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.chipRow}>
              {KINDS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setFor(key, k)}
                  style={[styles.chip, kind === k && styles.chipActive]}>
                  <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>{ATTENDANCE_LABEL[k]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text },
  reset: { fontSize: FontSize.small, color: Colors.accent },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  chipText: { fontSize: FontSize.body, color: Colors.subText, fontWeight: '600' },
  chipTextActive: { color: Colors.accent },
});
