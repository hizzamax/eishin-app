import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { FREE_DAYS_NOTE, PERIODS, SAMPLE_SUBJECTS, WEEKDAYS, type WeekdayLabel } from '@/data/seed';
import { applyExceptions, upcomingExceptions, useExceptions } from '@/lib/exceptions';
import { useProfile } from '@/lib/profile';
import { lessonsFor, toDateKey, weekdayLabel } from '@/lib/school';
import { useZemi, zemiForWeekday, type ZemiEntry } from '@/lib/zemi';

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

  // --- ゼミ ---
  const { items: zemiItems, add: addZemi, update: updateZemi, remove: removeZemi } = useZemi();
  const selectedZemi = zemiForWeekday(selected, zemiItems);
  const [zemiDraft, setZemiDraft] = useState({ name: '', weekday: '火' as WeekdayLabel, start: '', end: '', place: '' });
  const [editingZemiId, setEditingZemiId] = useState<string | null>(null);
  const [zemiError, setZemiError] = useState('');

  const submitZemi = () => {
    if (!zemiDraft.name.trim()) {
      setZemiError('ゼミ名を入力してください');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(zemiDraft.start) || !/^\d{1,2}:\d{2}$/.test(zemiDraft.end)) {
      setZemiError('時間は 15:00 の形式で入力してください');
      return;
    }
    const draft = { ...zemiDraft, name: zemiDraft.name.trim() };
    if (editingZemiId) updateZemi(editingZemiId, draft);
    else addZemi(draft);
    setZemiDraft({ name: '', weekday: '火', start: '', end: '', place: '' });
    setEditingZemiId(null);
    setZemiError('');
  };

  const editZemi = (z: ZemiEntry) => {
    setEditingZemiId(z.id);
    setZemiDraft({ name: z.name, weekday: z.weekday, start: z.start, end: z.end, place: z.place });
    setZemiError('');
  };

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
      <Link href="/share" asChild>
        <Pressable style={styles.shareButton}>
          <Text style={styles.shareButtonText}>時間割を共有・取り込む（QR・コード）</Text>
        </Pressable>
      </Link>
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

      {selectedZemi.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected}曜日のゼミ</Text>
          {selectedZemi.map((z) => (
            <View key={z.id} style={styles.row}>
              <Text style={styles.time}>
                {z.start}–{z.end}
              </Text>
              <Text style={styles.subject}>{z.name}</Text>
              {z.place ? <Text style={styles.note}>{z.place}</Text> : null}
            </View>
          ))}
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
      <Text style={styles.heading}>ゼミの登録・変更</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          自分のゼミを登録すると、その曜日の時間割とホームに表示されます。ゼミの時間は人によって違うため、自分の分を登録してください。
        </Text>
        <Text style={styles.formLabel}>ゼミ名 *</Text>
        <TextInput
          style={styles.input}
          value={zemiDraft.name}
          onChangeText={(name) => setZemiDraft({ ...zemiDraft, name })}
          placeholder="例：文芸ゼミ"
          placeholderTextColor={Colors.subText}
        />
        <Text style={styles.formLabel}>曜日</Text>
        <View style={styles.dayRow}>
          {DAY_TABS.map((day) => (
            <Pressable
              key={day}
              onPress={() => setZemiDraft({ ...zemiDraft, weekday: day })}
              style={[styles.dayChip, zemiDraft.weekday === day && styles.dayChipActive]}>
              <Text style={[styles.dayChipText, zemiDraft.weekday === day && styles.dayChipTextActive]}>{day}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={zemiDraft.start}
            onChangeText={(start) => setZemiDraft({ ...zemiDraft, start })}
            placeholder="開始 15:00"
            placeholderTextColor={Colors.subText}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={zemiDraft.end}
            onChangeText={(end) => setZemiDraft({ ...zemiDraft, end })}
            placeholder="終了 16:00"
            placeholderTextColor={Colors.subText}
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.formLabel}>場所（任意）</Text>
        <TextInput
          style={styles.input}
          value={zemiDraft.place}
          onChangeText={(place) => setZemiDraft({ ...zemiDraft, place })}
          placeholder="例：2-B教室"
          placeholderTextColor={Colors.subText}
        />
        {zemiError ? <Text style={styles.error}>{zemiError}</Text> : null}
        <Pressable onPress={submitZemi} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{editingZemiId ? 'ゼミを更新する' : 'ゼミを登録する'}</Text>
        </Pressable>
        {editingZemiId && (
          <Pressable
            onPress={() => {
              setEditingZemiId(null);
              setZemiDraft({ name: '', weekday: '火', start: '', end: '', place: '' });
              setZemiError('');
            }}
            style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>編集をやめる</Text>
          </Pressable>
        )}
        {zemiItems.length > 0 && <Text style={styles.formLabel}>登録済みのゼミ</Text>}
        {zemiItems.map((z) => (
          <View key={z.id} style={styles.rowBetween}>
            <Text style={styles.noteDark}>
              {z.weekday} {z.start}–{z.end} {z.name}
              {z.place ? `（${z.place}）` : ''}
            </Text>
            <View style={styles.row}>
              <Pressable onPress={() => editZemi(z)}>
                <Text style={styles.smallButtonText}>編集</Text>
              </Pressable>
              <Pressable onPress={() => removeZemi(z.id)}>
                <Text style={styles.smallButtonDanger}>削除</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  shareButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.accentSoft,
  },
  shareButtonText: { color: Colors.accent, fontSize: FontSize.body, fontWeight: '600' },
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
  formLabel: { fontSize: FontSize.small, color: Colors.subText },
  timeInput: { flex: 1 },
  error: { color: Colors.danger, fontSize: FontSize.small },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { color: Colors.subText, fontSize: FontSize.body },
});
