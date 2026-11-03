import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import type { SchoolEvent } from '@/data/seed';
import { eventDateLabel, upcomingEvents } from '@/lib/school';

const KIND_LABEL: Record<SchoolEvent['kind'], string> = {
  event: '行事',
  prep: '準備',
  school: '学校行事',
};

export default function CalendarScreen() {
  const events = useMemo(() => upcomingEvents(new Date()), []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>これからの予定</Text>
      {events.length === 0 && <Text style={styles.note}>登録されている予定はありません。</Text>}
      {events.map((event) => (
        <View key={`${event.date}-${event.title}`} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.date}>{eventDateLabel(event)}</Text>
            <View style={styles.kindChip}>
              <Text style={styles.kindText}>{KIND_LABEL[event.kind]}</Text>
            </View>
          </View>
          <Text style={styles.title}>{event.title}</Text>
          {(event.time || event.place) && (
            <Text style={styles.note}>
              {event.time}
              {event.time && event.place ? ' ・ ' : ''}
              {event.place}
            </Text>
          )}
        </View>
      ))}
      <Text style={styles.footer}>月間カレンダー表示と予定の追加・編集は今後のアップデートで対応予定です。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: FontSize.small, color: Colors.subText },
  kindChip: { backgroundColor: Colors.accentSoft, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  kindText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '600' },
  title: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text },
  note: { fontSize: FontSize.small, color: Colors.subText },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md },
});
