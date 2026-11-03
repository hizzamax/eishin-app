import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import type { SchoolEvent } from '@/data/seed';
import { isValidDateKey } from '@/lib/assignments';
import { usePersonalEvents } from '@/lib/personalEvents';
import { toDateKey, upcomingEvents, weekdayLabel } from '@/lib/school';

const KIND_LABEL: Record<SchoolEvent['kind'], string> = {
  event: '行事',
  prep: '準備',
  school: '学校行事',
};

type UnifiedEvent = {
  key: string;
  date: string;
  time: string;
  title: string;
  place: string;
  chip: string;
  personalId: string | null;
};

function dateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
}

export default function CalendarScreen() {
  const { items: personal, add, remove } = usePersonalEvents();
  const today = useMemo(() => new Date(), []);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toDateKey(today));
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [error, setError] = useState('');

  const events = useMemo<UnifiedEvent[]>(() => {
    const school: UnifiedEvent[] = upcomingEvents(today).map((e) => ({
      key: `school-${e.date}-${e.title}`,
      date: e.date,
      time: e.time,
      title: e.title,
      place: e.place,
      chip: KIND_LABEL[e.kind],
      personalId: null,
    }));
    const mine: UnifiedEvent[] = personal
      .filter((e) => e.date >= toDateKey(today))
      .map((e) => ({
        key: `personal-${e.id}`,
        date: e.date,
        time: e.time,
        title: e.title,
        place: e.place,
        chip: '個人',
        personalId: e.id,
      }));
    return [...school, ...mine].sort((a, b) => a.date.localeCompare(b.date));
  }, [today, personal]);

  const onAdd = () => {
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!isValidDateKey(date)) {
      setError('日付は 2026-11-10 の形式で入力してください');
      return;
    }
    add({ date, time: time.trim(), title: title.trim(), place: place.trim() });
    setTitle('');
    setTime('');
    setPlace('');
    setError('');
    setShowForm(false);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.heading}>これからの予定</Text>
        <Link href="/attendance" asChild>
          <Pressable>
            <Text style={styles.linkText}>登校予定</Text>
          </Pressable>
        </Link>
      </View>

      <Pressable onPress={() => setShowForm(!showForm)} style={styles.addButton}>
        <Text style={styles.addButtonText}>{showForm ? '閉じる' : '＋ 自分の予定を追加'}</Text>
      </Pressable>

      {showForm && (
        <View style={styles.card}>
          <Text style={styles.label}>タイトル *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="例：図書館で勉強" placeholderTextColor={Colors.subText} />
          <Text style={styles.label}>日付 *（YYYY-MM-DD）</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-11-10" placeholderTextColor={Colors.subText} autoCapitalize="none" />
          <Text style={styles.label}>時間（任意）</Text>
          <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="例：14:00-16:00" placeholderTextColor={Colors.subText} />
          <Text style={styles.label}>場所（任意）</Text>
          <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="任意" placeholderTextColor={Colors.subText} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={onAdd} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>追加する</Text>
          </Pressable>
        </View>
      )}

      {events.length === 0 && <Text style={styles.note}>登録されている予定はありません。</Text>}
      {events.map((event) => (
        <View key={event.key} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.date}>{dateLabel(event.date)}</Text>
            <View style={styles.kindChip}>
              <Text style={styles.kindText}>{event.chip}</Text>
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
          {event.personalId && (
            <Pressable onPress={() => remove(event.personalId!)}>
              <Text style={styles.deleteText}>この予定を削除</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Text style={styles.footer}>「個人」の予定は自分の端末だけに保存され、自由に変更・削除できます。学校行事などの共通の予定は配布された内容が表示されます。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600' },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.accentSoft,
  },
  addButtonText: { color: Colors.accent, fontSize: FontSize.body, fontWeight: '600' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadow,
  },
  date: { fontSize: FontSize.small, color: Colors.subText },
  kindChip: { backgroundColor: Colors.accentSoft, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  kindText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '600' },
  title: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text },
  note: { fontSize: FontSize.small, color: Colors.subText },
  label: { fontSize: FontSize.small, color: Colors.subText, marginTop: Spacing.xs },
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
  primaryButton: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  primaryButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '600' },
  error: { color: Colors.danger, fontSize: FontSize.small },
  deleteText: { color: Colors.danger, fontSize: FontSize.small, marginTop: Spacing.xs },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});
