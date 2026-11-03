import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { EVENTS, type SchoolEvent } from '@/data/seed';
import { isValidDateKey, useAssignments } from '@/lib/assignments';
import { ATTENDANCE_LABEL, effectiveKind, useAttendance } from '@/lib/attendance';
import { confirmAction } from '@/lib/confirm';
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
    ...EVENTS.filter((e) => e.date === selectedKey).map((e) => ({ title: e.title, time: e.time, place: e.place, chip: KIND_LABEL[e.kind], id: null as string | null })),
    ...personal
      .filter((e) => e.date === selectedKey)
      .map((e) => ({ title: e.title, time: e.time, place: e.place, chip: '個人', id: e.id as string | null })),
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
          <Pressable onPress={() => setMonthOffset(monthOffset - 1)} style={styles.navCircle}>
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={styles.cardTitle}>
            {viewYear}年{viewMonth + 1}月
          </Text>
          <View style={styles.rowGap}>
            {monthOffset !== 0 && (
              <Pressable
                onPress={() => {
                  setMonthOffset(0);
                  setSelectedKey(toDateKey(today));
                }}
                style={styles.todayPill}>
                <Text style={styles.todayPillText}>今日</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setMonthOffset(monthOffset + 1)} style={styles.navCircle}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.weekRow}>
          {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
            <Text key={w} style={[styles.weekCell, i === 0 && styles.weekSun, i === 6 && styles.weekSat]}>
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
                <Text
                  style={[
                    styles.cellDay,
                    isToday && !isSelected && styles.cellToday,
                    isToday && !isSelected && styles.cellTodayBadge,
                    isSelected && styles.cellDaySelected,
                    isSchool && styles.cellSchool,
                  ]}>
                  {d.getDate()}
                </Text>
                <View style={styles.dotRow}>
                  {schoolEventDates.has(key) && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? Colors.white : Colors.blue }]} />
                  )}
                  {personalDates.has(key) && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? Colors.white : Colors.success }]} />
                  )}
                  {dueDates.has(key) && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? Colors.white : Colors.danger }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.blue }]} />
            <Text style={styles.legendText}>学校行事</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>個人</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.legendText}>課題期限</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendText, styles.cellSchool]}>12</Text>
            <Text style={styles.legendText}>登校日</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{dateLabel(selectedKey)}</Text>
          <View style={styles.softPill}>
            <Text style={styles.softPillText}>{ATTENDANCE_LABEL[selectedKind]}</Text>
          </View>
        </View>
        {selectedEvents.length === 0 && selectedAssignments.length === 0 && (
          <Text style={styles.note}>予定はありません。</Text>
        )}
        {selectedEvents.map((e, i) => (
          <View key={i} style={styles.detailRow}>
            <View style={[styles.detailBar, { backgroundColor: e.chip === '個人' ? Colors.success : Colors.blue }]} />
            <View style={styles.detailMain}>
              <Text style={styles.noteDark}>{e.title}</Text>
              <Text style={styles.note}>
                {e.chip}
                {e.time ? ` ・ ${e.time}` : ''}
                {e.place ? ` ・ ${e.place}` : ''}
              </Text>
            </View>
            {e.id && (
              <Pressable
                hitSlop={8}
                onPress={() => confirmAction('予定を削除しますか？', `「${e.title}」を削除します。`, () => remove(e.id!))}>
                <Text style={styles.deleteText}>削除</Text>
              </Pressable>
            )}
          </View>
        ))}
        {selectedAssignments.map((a) => (
          <View key={a.id} style={styles.detailRow}>
            <View style={[styles.detailBar, { backgroundColor: Colors.danger }]} />
            <View style={styles.detailMain}>
              <Text style={styles.noteDark}>
                {a.subject ? `${a.subject}：` : ''}
                {a.title}
              </Text>
              <Text style={styles.note}>課題の期限</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          if (!showForm) setDate(selectedKey);
          setShowForm(!showForm);
        }}
        style={styles.addButton}>
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
      {events.slice(0, 8).map((event) => (
        <View key={event.key} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.date}>{dateLabel(event.date)}</Text>
            <View
              style={[
                styles.kindChip,
                event.chip === '個人' && { backgroundColor: Colors.successSoft },
                event.chip === '準備' && { backgroundColor: Colors.accentSoft },
                event.chip !== '個人' && event.chip !== '準備' && { backgroundColor: Colors.blueSoft },
              ]}>
              <Text
                style={[
                  styles.kindText,
                  event.chip === '個人' && { color: Colors.success },
                  event.chip !== '個人' && event.chip !== '準備' && { color: Colors.blue },
                ]}>
                {event.chip}
              </Text>
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
            <Pressable
              onPress={() =>
                confirmAction('予定を削除しますか？', `「${event.title}」を削除します。`, () => remove(event.personalId!))
              }>
              <Text style={styles.deleteText}>この予定を削除</Text>
            </Pressable>
          )}
        </View>
      ))}
      {events.length > 8 && (
        <Text style={styles.note}>ほか {events.length - 8} 件の予定があります。上のカレンダーで日付を選ぶと、その日の予定が見られます。</Text>
      )}
      <Text style={styles.footer}>「個人」の予定はこの端末だけに保存されます。</Text>
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
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.dark,
  },
  addButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '700' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: '14.28%', textAlign: 'center', fontSize: FontSize.caption, color: Colors.subText, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', paddingVertical: 6, alignItems: 'center', borderRadius: Radius.md, minHeight: 46 },
  cellSelected: { backgroundColor: Colors.accent },
  cellDay: { fontSize: FontSize.small, color: Colors.text },
  cellToday: { color: Colors.accent, fontWeight: '700' },
  cellTodayBadge: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 999,
    width: 26,
    height: 26,
    lineHeight: 26,
    textAlign: 'center',
    overflow: 'hidden',
  },
  cellSchool: { textDecorationLine: 'underline' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  navCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.subBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 22, color: Colors.text, fontWeight: '600', lineHeight: 24 },
  todayPill: { backgroundColor: Colors.accentSoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, justifyContent: 'center' },
  todayPillText: { fontSize: FontSize.small, color: Colors.accent, fontWeight: '700' },
  weekSun: { color: Colors.sunday },
  weekSat: { color: Colors.blue },
  cellDaySelected: { color: Colors.white, fontWeight: '700' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendText: { fontSize: FontSize.caption, color: Colors.subText },
  softPill: { backgroundColor: Colors.accentSoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  softPillText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  detailRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },
  detailBar: { width: 4, borderRadius: 2 },
  detailMain: { flex: 1, gap: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  noteDark: { fontSize: FontSize.body, color: Colors.text },
  date: { fontSize: FontSize.small, color: Colors.subText },
  kindChip: { backgroundColor: Colors.accentSoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 3 },
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
  primaryButton: { backgroundColor: Colors.dark, borderRadius: Radius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  primaryButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
  error: { color: Colors.danger, fontSize: FontSize.small },
  deleteText: { color: Colors.danger, fontSize: FontSize.small, marginTop: Spacing.xs },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});

