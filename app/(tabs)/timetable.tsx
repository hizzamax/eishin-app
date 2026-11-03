import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { FREE_DAYS_NOTE, PERIODS, SAMPLE_SUBJECTS, WEEKDAYS, type WeekdayLabel } from '@/data/seed';
import { applyExceptions, upcomingExceptions, useExceptions } from '@/lib/exceptions';
import { useProfile } from '@/lib/profile';
import { lessonsFor, toDateKey, weekdayLabel } from '@/lib/school';

const DAY_TABS: WeekdayLabel[] = ['月', '火', '水', '木', '金', '土'];

export default function TimetableScreen() {
  const profile = useProfile();
  const { items: exceptions, upsert, remove: removeException } = useExceptions();
  const today = useMemo(() => WEEKDAYS[new Date().getDay()], []);
  const [selected, setSelected] = useState<WeekdayLabel>(DAY_TABS.includes(today) ? today : '月');

  const classDays = profile?.classDays ?? ['月', '水', '金'];
  const isDay = classDays.includes(selected);
  const subjects = SAMPLE_SUBJECTS[selected];

  // --- 特定日の変更（例外） ---
  const nextDays = useMemo(() => {
    const list: { key: string; date: Date }[] = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      list.push({ key: toDateKey(d), date: d });
    }
    return list;
  }, []);
  const [editDateKey, setEditDateKey] = useState<string>(nextDays[0].key);
  const editDate = useMemo(() => new Date(`${editDateKey}T00:00:00`), [editDateKey]);
  const editRowsRaw = lessonsFor(editDate, classDays);
  const editRows = editRowsRaw ? applyExceptions(editRowsRaw, editDate, exceptions) : null;
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [subjectInput, setSubjectInput] = useState('');
  const nearExceptions = upcomingExceptions(exceptions, new Date());

  const saveException = (subject: string | null) => {
    if (!editingPeriod) return;
    upsert({ date: editDateKey, periodLabel: editingPeriod, subject, note: '' });
    setEditingPeriod(null);
    setSubjectInput('');
  };

  const clearException = (periodLabel: string) => {
    const ex = exceptions.find((e) => e.date === editDateKey && e.periodLabel === periodLabel);
    if (ex) removeException(ex.id);
    setEditingPeriod(null);
  };

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

      <Text style={styles.heading}>特定の日だけ変更する</Text>
      <View style={styles.dayRow}>
        {nextDays.map(({ key, date }) => (
          <Pressable
            key={key}
            onPress={() => {
              setEditDateKey(key);
              setEditingPeriod(null);
            }}
            style={[styles.dateChip, editDateKey === key && styles.dayChipActive]}>
            <Text style={[styles.dateChipText, editDateKey === key && styles.dayChipTextActive]}>
              {date.getMonth() + 1}/{date.getDate()}（{weekdayLabel(date)}）
            </Text>
          </Pressable>
        ))}
      </View>

      {editRows ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editDateKey} の授業</Text>
          {editRows.map((row) => (
            <View key={row.period.label}>
              <Pressable
                onPress={() => {
                  setEditingPeriod(editingPeriod === row.period.label ? null : row.period.label);
                  setSubjectInput(row.subject ?? '');
                }}
                style={styles.row}>
                <Text style={styles.time}>
                  {row.period.start}–{row.period.end}
                </Text>
                <Text style={styles.label}>{row.period.label}</Text>
                <Text style={styles.subject}>
                  {row.changed && row.subject === null ? '休講' : (row.subject ?? '未設定')}
                </Text>
                {row.changed && <Text style={styles.changedBadge}>変更</Text>}
              </Pressable>
              {editingPeriod === row.period.label && (
                <View style={styles.editor}>
                  <TextInput
                    style={styles.input}
                    value={subjectInput}
                    onChangeText={setSubjectInput}
                    placeholder="変更後の科目名"
                    placeholderTextColor={Colors.subText}
                  />
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => subjectInput.trim() && saveException(subjectInput.trim())}
                      style={styles.smallButton}>
                      <Text style={styles.smallButtonText}>変更を保存</Text>
                    </Pressable>
                    <Pressable onPress={() => saveException(null)} style={styles.smallButton}>
                      <Text style={styles.smallButtonText}>休講にする</Text>
                    </Pressable>
                    {row.changed && (
                      <Pressable onPress={() => clearException(row.period.label)} style={styles.smallButton}>
                        <Text style={styles.smallButtonDanger}>変更を取り消す</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
          <Text style={styles.note}>授業の行をタップすると、その日だけの変更ができます。</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.note}>{editDateKey} は授業日ではないため、変更できる授業がありません。</Text>
        </View>
      )}

      {nearExceptions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>登録済みの変更</Text>
          {nearExceptions.map((e) => (
            <View key={e.id} style={styles.rowBetween}>
              <Text style={styles.noteDark}>
                {e.date} {e.periodLabel}：{e.subject === null ? '休講' : e.subject}
              </Text>
              <Pressable onPress={() => removeException(e.id)}>
                <Text style={styles.smallButtonDanger}>削除</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  dayRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  dayChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  dateChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  dayChipText: { fontSize: FontSize.body, color: Colors.subText, fontWeight: '600' },
  dateChipText: { fontSize: FontSize.small, color: Colors.subText, fontWeight: '600' },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: FontSize.small, color: Colors.subText, width: 96 },
  label: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text, width: 36 },
  subject: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  changedBadge: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  note: { fontSize: FontSize.small, color: Colors.subText },
  noteDark: { fontSize: FontSize.body, color: Colors.text },
  editor: { gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.sm },
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
  smallButton: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  smallButtonText: { fontSize: FontSize.small, color: Colors.text },
  smallButtonDanger: { fontSize: FontSize.small, color: Colors.danger },
});
