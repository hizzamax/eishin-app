import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { EVENTS, type SchoolEvent } from '@/data/seed';
import { isValidDateKey, useAssignments } from '@/lib/assignments';
import { ATTENDANCE_LABEL, effectiveKind, useAttendance } from '@/lib/attendance';
import { usePersonalEvents } from '@/lib/personalEvents';
import { useProfile } from '@/lib/profile';
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
  const profile = useProfile();
  const { map: attendanceMap } = useAttendance();
  const { items: assignments } = useAssignments();
  const today = useMemo(() => new Date(), []);
  const classDays = profile?.classDays ?? ['月', '水', '金'];

  // --- 月間表示 ---
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(viewYear, viewMonth, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const schoolEventDates = useMemo(() => new Set(EVENTS.map((e) => e.date)), []);
  const personalDates = useMemo(() => new Set(personal.map((e) => e.date)), [personal]);
  const dueDates = useMemo(
    () => new Set(assignments.filter((a) => a.status !== 'done').map((a) => a.dueDate)),
    [assignments],
  );
  const selectedDate = useMemo(() => new Date(`${selectedKey}T00:00:00`), [selectedKey]);
  const selectedKind = effectiveKind(selectedDate, classDays, attendanceMap);
  const selectedEvents = [
    ...EVENTS.filter((e) => e.date === selectedKey).map((e) => ({ title: e.title, time: e.time, place: e.place, chip: KIND_LABEL[e.kind] })),
    ...personal
      .filter((e) => e.date === selectedKey)
      .map((e) => ({ title: e.title, time: e.time, place: e.place, chip: '個人' })),
  ];
  const selectedAssignments = assignments.filter((a) => a.dueDate === selectedKey && a.status !== 'done');
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
        <View style={styles.rowGap}>
          <Link href="/import" asChild>
            <Pressable>
              <Text style={styles.linkText}>取り込み</Text>
            </Pressable>
          </Link>
          <Link href="/attendance" asChild>
            <Pressable>
              <Text style={styles.linkText}>登校予定</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => setMonthOffset(monthOffset - 1)}>
            <Text style={styles.linkText}>‹ 前月</Text>
          </Pressable>
          <Text style={styles.cardTitle}>
            {viewYear}年{viewMonth + 1}月
          </Text>
          <Pressable onPress={() => setMonthOffset(monthOffset + 1)}>
            <Text style={styles.linkText}>次月 ›</Text>
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
            <Text key={w} style={styles.weekCell}>
              {w}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((key, i) => {
            if (!key) return <View key={`empty-${i}`} style={styles.cell} />;
            const d = new Date(`${key}T00:00:00`);
            const isToday = key === toDateKey(today);
            const isSelected = key === selectedKey;
            const isSchool = effectiveKind(d, classDays, attendanceMap) === 'school';
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedKey(key)}
                style={[styles.cell, isSelected && styles.cellSelected]}>
                <Text style={[styles.cellDay, isToday && styles.cellToday, isSchool && styles.cellSchool]}>
                  {d.getDate()}
                </Text>
                <View style={styles.dotRow}>
                  {schoolEventDates.has(key) && <View style={[styles.dot, { backgroundColor: Colors.accent }]} />}
                  {personalDates.has(key) && <View style={[styles.dot, { backgroundColor: Colors.success }]} />}
                  {dueDates.has(key) && <View style={[styles.dot, { backgroundColor: Colors.danger }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>青＝学校行事、緑＝個人の予定、赤＝課題の期限。下線は登校日です。日付をタップすると下に詳細が出ます。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{dateLabel(selectedKey)} の詳細</Text>
        <Text style={styles.note}>登校予定：{ATTENDANCE_LABEL[selectedKind]}</Text>
        {selectedEvents.length === 0 && selectedAssignments.length === 0 && (
          <Text style={styles.note}>予定はありません。</Text>
        )}
        {selectedEvents.map((e, i) => (
          <Text key={i} style={styles.noteDark}>
            [{e.chip}] {e.title}
            {e.time ? ` ${e.time}` : ''}
            {e.place ? ` ・ ${e.place}` : ''}
          </Text>
        ))}
        {selectedAssignments.map((a) => (
          <Text key={a.id} style={styles.noteDark}>
            [課題] {a.subject ? `${a.subject}：` : ''}
            {a.title}（今日まで）
          </Text>
        ))}
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
  rowGap: { flexDirection: 'row', gap: Spacing.md },
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
  cardTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: '14.28%', textAlign: 'center', fontSize: FontSize.caption, color: Colors.subText, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', paddingVertical: 6, alignItems: 'center', borderRadius: Radius.sm, minHeight: 44 },
  cellSelected: { backgroundColor: Colors.accentSoft },
  cellDay: { fontSize: FontSize.small, color: Colors.text },
  cellToday: { color: Colors.accent, fontWeight: '700' },
  cellSchool: { textDecorationLine: 'underline' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  noteDark: { fontSize: FontSize.body, color: Colors.text },
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
