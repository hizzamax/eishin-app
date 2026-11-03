import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ALL_CLASS_DAY_CANDIDATES, PERIODS, SAMPLE_SUBJECTS, type WeekdayLabel } from '@/data/seed';
import { markOnboarded } from '@/lib/onboarding';
import { loadProfile, saveProfile } from '@/lib/profile';
import { LESSON_COUNT, loadSubjectsMap, saveSubjectsMap, type SubjectsMap } from '@/lib/subjects';

const GRADES = ['1', '2', '3'] as const;
const COURSES = ['探究コース', '集中スクーリング'] as const;
const DAY_ORDER: WeekdayLabel[] = ['月', '火', '水', '木', '金', '土', '日'];
const PERIOD_LABELS = PERIODS.filter((p) => p.label !== 'HR').map((p) => p.label);

function lettersForGrade(grade: string): string[] {
  return grade === '1' ? ['A', 'B', 'C'] : ['A', 'B'];
}

function blankWeek(): string[] {
  return Array.from({ length: LESSON_COUNT }, () => '');
}

function sampleWeek(day: WeekdayLabel): string[] {
  const s = SAMPLE_SUBJECTS[day];
  return Array.from({ length: LESSON_COUNT }, (_, i) => s?.[i] ?? '');
}

/**
 * 初回起動時の案内画面。
 * クラス・コース・授業曜日・科目（曜日ごと）を選んでもらい、
 * 「最初からサンプルが入っていて自分のデータと勘違いする」を防ぐ。
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('3');
  const [letter, setLetter] = useState('A');
  const [course, setCourse] = useState<string>('探究コース');
  const [classDays, setClassDays] = useState<WeekdayLabel[]>(['月', '水', '金']);
  const [subjectsDraft, setSubjectsDraft] = useState<Partial<Record<WeekdayLabel, string[]>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 既存の保存内容があれば初期値として読み込む（通常はデフォルト＝サンプル）
  useEffect(() => {
    (async () => {
      const profile = await loadProfile();
      const m = profile.className.match(/^([1-3])-([A-C])$/);
      if (m) {
        setGrade(m[1]);
        setLetter(m[2]);
      }
      if (profile.course) setCourse(profile.course);
      if (profile.name) setName(profile.name);
      const days: WeekdayLabel[] = profile.classDays.length > 0 ? profile.classDays : ['月', '水', '金'];
      setClassDays(days);
      const map = await loadSubjectsMap();
      const draft: Partial<Record<WeekdayLabel, string[]>> = {};
      for (const day of DAY_ORDER) {
        const custom = map[day];
        draft[day] = custom
          ? Array.from({ length: LESSON_COUNT }, (_, i) => custom[i] ?? '')
          : sampleWeek(day);
      }
      setSubjectsDraft(draft);
    })();
  }, []);

  const toggleDay = (day: WeekdayLabel) => {
    setError('');
    setClassDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
    setSubjectsDraft((prev) => (prev[day] ? prev : { ...prev, [day]: sampleWeek(day) }));
  };

  const setSubject = (day: WeekdayLabel, idx: number, value: string) => {
    setSubjectsDraft((prev) => {
      const week = [...(prev[day] ?? blankWeek())];
      week[idx] = value;
      return { ...prev, [day]: week };
    });
  };

  const finish = async () => {
    await markOnboarded();
    onDone();
  };

  const onStart = async () => {
    if (classDays.length === 0) {
      setError('授業がある曜日を1日以上選んでください');
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        name: name.trim(),
        className: `${grade}-${letter}`,
        course,
        classDays,
      });
      const map: SubjectsMap = {};
      for (const day of classDays) {
        const week = subjectsDraft[day] ?? blankWeek();
        map[day] = week.map((s) => {
          const v = s.trim();
          return v ? v : null;
        });
      }
      await saveSubjectsMap(map);
      await finish();
    } catch {
      setError('保存できませんでした。もう一度お試しください。');
      setSaving(false);
    }
  };

  const selectedDaysSorted = DAY_ORDER.filter((d) => classDays.includes(d));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: Spacing.xl + insets.top, paddingBottom: Spacing.xl + insets.bottom }]}>
      <Text style={styles.appName}>英心アプリ（非公式）</Text>
      <Text style={styles.title}>ようこそ</Text>
      <Text style={styles.lead}>
        はじめに、あなたのクラスと授業曜日を教えてください。選んだ内容はこの端末の中だけに保存され、外部に送信されることはありません。あとから設定タブでいつでも変更できます。
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>クラス</Text>
        <Text style={styles.label}>学年</Text>
        <View style={styles.chipRow}>
          {GRADES.map((g) => {
            const active = grade === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  setGrade(g);
                  if (!lettersForGrade(g).includes(letter)) setLetter('A');
                }}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}年</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>組</Text>
        <View style={styles.chipRow}>
          {lettersForGrade(grade).map((l) => {
            const active = letter === l;
            return (
              <Pressable key={l} onPress={() => setLetter(l)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{l}組</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>コース</Text>
        <View style={styles.chipRow}>
          {COURSES.map((c) => {
            const active = course === c;
            return (
              <Pressable key={c} onPress={() => setCourse(c)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>
          選択中：{grade}年{letter}組・{course}
        </Text>
        <Text style={styles.label}>名前（任意）</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="名前（任意）"
          placeholderTextColor={Colors.subText}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>授業がある曜日</Text>
        <View style={styles.chipRow}>
          {ALL_CLASS_DAY_CANDIDATES.map((day) => {
            const active = classDays.includes(day);
            return (
              <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>探究コースは月・水・金が基本です。自分の授業曜日に合わせてください。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>科目</Text>
        <Text style={styles.note}>
          授業曜日の科目を入力してください。いま表示されているのはサンプルです。空欄は「未設定」になり、あとから時間割タブで変更できます。
        </Text>
        {selectedDaysSorted.map((day) => (
          <View key={day} style={styles.dayBlock}>
            <Text style={styles.dayTitle}>{day}曜日</Text>
            {PERIOD_LABELS.map((label, i) => (
              <View key={label} style={styles.subjectRow}>
                <Text style={styles.periodLabel}>{label}</Text>
                <TextInput
                  style={[styles.input, styles.subjectInput]}
                  value={subjectsDraft[day]?.[i] ?? ''}
                  onChangeText={(v) => setSubject(day, i, v)}
                  placeholder={`${label}の科目`}
                  placeholderTextColor={Colors.subText}
                />
              </View>
            ))}
          </View>
        ))}
        {selectedDaysSorted.length === 0 && <Text style={styles.note}>先に授業がある曜日を選んでください。</Text>}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={onStart} disabled={saving} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{saving ? '保存中…' : 'この内容ではじめる'}</Text>
      </Pressable>
      <Pressable onPress={() => void finish()} style={styles.ghostButton}>
        <Text style={styles.ghostButtonText}>あとで設定する（サンプルのまま始める）</Text>
      </Pressable>
      <Text style={styles.footerNote}>このアプリは生徒有志による非公式アプリで、学校公式のものではありません。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  appName: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: FontSize.title, fontWeight: '700', color: Colors.text },
  lead: { fontSize: FontSize.body, color: Colors.subText, lineHeight: 22 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.small, color: Colors.subText, marginTop: Spacing.xs },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  error: { fontSize: FontSize.small, color: Colors.danger, lineHeight: 20 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: FontSize.body, color: Colors.text, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  dayBlock: { gap: Spacing.sm, marginTop: Spacing.sm },
  dayTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  periodLabel: { fontSize: FontSize.small, color: Colors.subText, width: 32 },
  subjectInput: { flex: 1 },
  primaryButton: { backgroundColor: Colors.dark, borderRadius: Radius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  primaryButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { fontSize: FontSize.body, color: Colors.subText },
  footerNote: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', lineHeight: 18 },
});
