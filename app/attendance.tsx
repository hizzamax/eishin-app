import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ATTENDANCE_LABEL, dateLabel, effectiveKind, useAttendance, type AttendanceKind } from '@/lib/attendance';
import { useProfile } from '@/lib/profile';
import { toDateKey } from '@/lib/school';

const KINDS: AttendanceKind[] = ['school', 'home', 'off'];
const KIND_ICON = {
  school: { ios: 'building.2.fill', android: 'school', web: 'school' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  off: { ios: 'moon.fill', android: 'bedtime', web: 'bedtime' },
} as const satisfies Record<AttendanceKind, { ios: string; android: string; web: string }>;

const KIND_COLOR: Record<AttendanceKind, string> = {
  school: Colors.blue,
  home: Colors.accent,
  off: Colors.subText,
};
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
      <Text style={styles.heading}>これからの14日間</Text>
      <Text style={styles.note}>タップで切り替えると保存されます（学校の正式な出席記録ではありません）。</Text>
      <View style={styles.card}>
        {days.map(({ key, date }, idx) => {
          const kind = effectiveKind(date, classDays, map);
          const overridden = map[key] !== undefined;
          return (
            <View key={key} style={[styles.dayBlock, idx > 0 && styles.dayDivider]}>
              <View style={styles.rowBetween}>
                <Text style={styles.dateText}>
                  {dateLabel(key)}
                  {idx === 0 ? <Text style={styles.todayText}> 今日</Text> : null}
                </Text>
                {overridden && (
                  <Pressable onPress={() => setFor(key, null)} hitSlop={8}>
                    <Text style={styles.reset}>既定に戻す</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.chipRow}>
                {KINDS.map((k) => {
                  const active = kind === k;
                  const icon = KIND_ICON[k];
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setFor(key, k)}
                      style={[styles.chip, active && styles.chipActive]}>
                      <SymbolView
                        name={icon}
                        tintColor={active ? Colors.white : KIND_COLOR[k]}
                        size={15}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {ATTENDANCE_LABEL[k]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow,
  },
  dayBlock: { gap: Spacing.sm, paddingVertical: Spacing.md },
  dayDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text },
  todayText: { fontSize: FontSize.small, color: Colors.accent, fontWeight: '700' },
  reset: { fontSize: FontSize.small, color: Colors.accent },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 38,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: FontSize.small, color: Colors.subText, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
});
