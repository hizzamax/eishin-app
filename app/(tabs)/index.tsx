import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { FREE_DAYS_NOTE } from '@/data/seed';
import { daysUntil, urgentAssignments, useAssignments } from '@/lib/assignments';
import { effectiveKind } from '@/lib/attendance';
import { useAttendance } from '@/lib/attendance';
import { applyExceptions, upcomingExceptions, useExceptions, type AppliedRow } from '@/lib/exceptions';
import { usePersonalEvents } from '@/lib/personalEvents';
import { useProfile } from '@/lib/profile';
import { formatDate, hasSampleSubjects, lessonsFor, toDateKey, upcomingEvents, weekdayLabel } from '@/lib/school';

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function nextFromRows(now: Date, rows: AppliedRow[]): { row: AppliedRow; inMinutes: number } | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const row of rows) {
    if (row.changed && row.subject === null) continue; // 休講は飛ばす
    const start = minutesOf(row.period.start);
    if (start > nowMin) return { row, inMinutes: start - nowMin };
  }
  return null;
}

export default function HomeScreen() {
  const profile = useProfile();
  const { items: assignments } = useAssignments();
  const { map: attendanceMap } = useAttendance();
  const { items: exceptions } = useExceptions();
  const { items: personalEvents } = usePersonalEvents();

  const now = useMemo(() => new Date(), []);
  const classDays = profile?.classDays ?? ['月', '水', '金'];
  const kind = effectiveKind(now, classDays, attendanceMap);

  const rawLessons = kind === 'school' ? lessonsFor(now, classDays) : null;
  const lessons = rawLessons ? applyExceptions(rawLessons, now, exceptions) : null;
  const upcoming = lessons ? nextFromRows(now, lessons) : null;

  const urgent = urgentAssignments(assignments, 3);
  const nearExceptions = upcomingExceptions(exceptions, now).slice(0, 3);

  const nextEv = useMemo(() => {
    const todayKey = toDateKey(now);
    const school = upcomingEvents(now).map((e) => ({ date: e.date, time: e.time, title: e.title, place: e.place }));
    const personal = personalEvents
      .filter((e) => e.date >= todayKey)
      .map((e) => ({ date: e.date, time: e.time, title: e.title, place: e.place }));
    const all = [...school, ...personal].sort((a, b) => a.date.localeCompare(b.date));
    if (all.length === 0) return null;
    const first = all[0];
    const target = new Date(`${first.date}T00:00:00`);
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { ...first, inDays: Math.round((target.getTime() - base.getTime()) / 86400000) };
  }, [now, personalEvents]);

  const todayTitle =
    kind === 'school' ? '今日は登校日です' : kind === 'home' ? '今日は自宅学習日です' : '今日はお休みです';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{formatDate(now)}</Text>
      <Text style={styles.appName}>英心アプリ（非公式）</Text>
      <Text style={styles.profileLine}>
        {profile ? `${profile.course} ${profile.className}` : '読み込み中…'}
        {profile?.name ? ` ・ ${profile.name}さん` : ''}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{todayTitle}</Text>
        {kind !== 'school' && <Text style={styles.note}>{kind === 'off' ? FREE_DAYS_NOTE : '登校予定で変更した内容が反映されています'}</Text>}
        {lessons ? (
          <View style={styles.lessonList}>
            {lessons.map((row) => (
              <View key={row.period.label} style={styles.lessonRow}>
                <Text style={styles.lessonTime}>
                  {row.period.start}–{row.period.end}
                </Text>
                <Text style={styles.lessonLabel}>{row.period.label}</Text>
                <Text style={styles.lessonSubject}>
                  {row.changed && row.subject === null
                    ? '休講'
                    : (row.subject ?? (row.period.label === 'HR' ? '' : '未設定'))}
                </Text>
                {row.changed && <Text style={styles.changedBadge}>変更</Text>}
              </View>
            ))}
          </View>
        ) : null}
        {lessons && hasSampleSubjects(now) && <Text style={styles.note}>※ 科目はサンプルです（週ごとに変わります）</Text>}
        {upcoming && (
          <Text style={styles.nextLesson}>
            次の授業：{upcoming.row.period.label}
            {upcoming.row.subject ? ` ${upcoming.row.subject}` : ''}（あと{upcoming.inMinutes}分）
          </Text>
        )}
        <Link href="/attendance" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>登校予定を変更する</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>期限が近い課題</Text>
        {urgent.length === 0 && <Text style={styles.note}>未完了の課題はありません。</Text>}
        {urgent.map((a) => {
          const d = daysUntil(a.dueDate, now);
          return (
            <View key={a.id} style={styles.assignmentRow}>
              <Text style={styles.assignmentTitle}>
                {a.subject ? `${a.subject}：` : ''}
                {a.title}
              </Text>
              <Text style={[styles.assignmentDue, d < 0 && styles.assignmentOverdue]}>
                {d < 0 ? `${-d}日超過` : d === 0 ? '今日まで' : `あと${d}日`}
              </Text>
            </View>
          );
        })}
        <Link href="/assignments" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>課題を管理する</Text>
          </Pressable>
        </Link>
      </View>

      {nearExceptions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>直近の時間割変更</Text>
          {nearExceptions.map((e) => (
            <Text key={e.id} style={styles.note}>
              {e.date} {e.periodLabel}：{e.subject === null ? '休講' : e.subject}
              {e.note ? `（${e.note}）` : ''}
            </Text>
          ))}
        </View>
      )}

      {nextEv && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>次の行事・予定</Text>
          <Text style={styles.eventTitle}>{nextEv.title}</Text>
          <Text style={styles.note}>
            {(() => {
              const d = new Date(`${nextEv.date}T00:00:00`);
              return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
            })()}
            {nextEv.time ? ` ${nextEv.time}` : ''}
            {nextEv.place ? ` ・ ${nextEv.place}` : ''}
          </Text>
          <Text style={styles.countdown}>{nextEv.inDays === 0 ? '今日です' : `あと ${nextEv.inDays} 日`}</Text>
        </View>
      )}

      <Text style={styles.footer}>このアプリは生徒有志による非公式アプリです。学校公式のものではありません。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  date: { fontSize: FontSize.small, color: Colors.subText },
  appName: { fontSize: FontSize.title, fontWeight: '700', color: Colors.text },
  profileLine: { fontSize: FontSize.body, color: Colors.subText, marginTop: -Spacing.md },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  note: { fontSize: FontSize.small, color: Colors.subText },
  lessonList: { gap: Spacing.sm, marginTop: Spacing.xs },
  lessonRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  lessonTime: { fontSize: FontSize.small, color: Colors.subText, width: 96 },
  lessonLabel: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text, width: 36 },
  lessonSubject: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  changedBadge: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  nextLesson: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600', marginTop: Spacing.xs },
  linkButton: { marginTop: Spacing.xs },
  linkButtonText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600' },
  assignmentRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm },
  assignmentTitle: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  assignmentDue: { fontSize: FontSize.small, color: Colors.subText },
  assignmentOverdue: { color: Colors.danger, fontWeight: '700' },
  eventTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  countdown: { fontSize: FontSize.display, fontWeight: '700', color: Colors.accent },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md },
});
