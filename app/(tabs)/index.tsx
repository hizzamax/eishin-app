import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, HeroGradient, HeroShadow, Radius, Shadow, Spacing } from '@/constants/Theme';
import { useAnnouncements } from '@/lib/announcements';
import { daysUntil, urgentAssignments, useAssignments } from '@/lib/assignments';
import { applyExceptions, upcomingExceptions, useExceptions, type AppliedRow } from '@/lib/exceptions';
import { usePersonalEvents } from '@/lib/personalEvents';
import { useProfile } from '@/lib/profile';
import { formatDate, freeDayNote, hasSampleSubjects, isClassDay, lessonsFor, toDateKey, upcomingEvents, weekdayLabel } from '@/lib/school';
import { subjectColor } from '@/lib/subjectColor';
import { isCustomDay, useSubjects } from '@/lib/subjects';
import { useZemi, zemiFor } from '@/lib/zemi';

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

function greeting(hour: number): string {
  if (hour < 11) return 'おはようございます';
  if (hour < 18) return 'こんにちは';
  return 'こんばんは';
}

export default function HomeScreen() {
  const profile = useProfile();
  const { items: assignments } = useAssignments();
  const { items: exceptions } = useExceptions();
  const { items: personalEvents } = usePersonalEvents();
  const { items: zemiItems } = useZemi();
  const { items: announcementItems, unreadCount } = useAnnouncements();
  const latestAnnouncement = announcementItems[0];
  const { map: subjectsMap } = useSubjects();

  const [now, setNow] = useState(() => new Date());
  // 画面に戻ってきたら現在時刻を取り直す（開きっぱなしで古くならないように）
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );
  const classDays = profile?.classDays ?? ['月', '水', '金'];
  const isSchoolToday = isClassDay(now, classDays);

  const nextSchoolDay = useMemo(() => {
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (isClassDay(d, classDays)) return d;
    }
    return null;
  }, [now, classDays]);

  const rawLessons = isSchoolToday ? lessonsFor(now, classDays, subjectsMap) : null;
  const lessons = rawLessons ? applyExceptions(rawLessons, now, exceptions) : null;
  const upcoming = lessons ? nextFromRows(now, lessons) : null;

  const urgent = urgentAssignments(assignments, 3);
  const nearExceptions = upcomingExceptions(exceptions, now).slice(0, 3);
  const todayZemi = zemiFor(now, zemiItems);

  const nextEv = useMemo(() => {
    const todayKey = toDateKey(now);
    const school = upcomingEvents(now).map((e) => ({ date: e.date, time: e.time, title: e.title, place: e.place }));
    const personal = personalEvents
      .filter((e) => e.date >= todayKey)
      .map((e) => ({ date: e.date, time: e.time, title: e.title, place: e.place }));
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const isPastToday = (e: { date: string; time: string }) => {
      if (e.date !== todayKey || !e.time) return false;
      const range = e.time.match(/(\d{1,2}):(\d{2})\s*[-–〜~]\s*(\d{1,2}):(\d{2})/);
      if (range) return Number(range[3]) * 60 + Number(range[4]) <= nowMin;
      const single = e.time.match(/(\d{1,2}):(\d{2})/);
      if (single) return Number(single[1]) * 60 + Number(single[2]) <= nowMin;
      return false;
    };
    const all = [...school, ...personal]
      .filter((e) => !isPastToday(e))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (all.length === 0) return null;
    const first = all[0];
    const target = new Date(`${first.date}T00:00:00`);
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { ...first, inDays: Math.round((target.getTime() - base.getTime()) / 86400000) };
  }, [now, personalEvents]);

  const kindLabel = isSchoolToday ? '登校日' : 'お休み';
  const heroMain =
    isSchoolToday
      ? upcoming
        ? `次の授業は ${upcoming.row.subject ?? (upcoming.row.period.label === 'HR' ? 'ホームルーム' : upcoming.row.period.label)}`
        : '今日の授業は終わりました'
      : nextSchoolDay
        ? `次の登校日は ${nextSchoolDay.getMonth() + 1}月${nextSchoolDay.getDate()}日（${weekdayLabel(nextSchoolDay)}）`
        : '直近14日間に登校日はありません';
  const heroSub =
    isSchoolToday
      ? upcoming
        ? `${upcoming.row.period.label === 'HR' ? 'ホームルーム' : upcoming.row.period.label} ${upcoming.row.period.start}〜 ・ あと${upcoming.inMinutes}分`
        : 'おつかれさまでした'
      : freeDayNote(weekdayLabel(now));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.appName}>英心アプリ（非公式）</Text>
        <Text style={styles.greeting}>
          {greeting(now.getHours())}
          {profile?.name ? `、${profile.name}さん` : ''}
        </Text>
        <Text style={styles.dateLine}>
          {formatDate(now)}
          {profile ? ` ・ ${profile.course} ${profile.className}` : ''}
        </Text>
      </View>

      {/* ヒーローカード：今日の状態 */}
      <View style={styles.heroWrap}>
        <LinearGradient colors={HeroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroDeco1} />
          <View style={styles.heroDeco2} />
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{kindLabel}</Text>
          </View>
          <Text style={styles.heroMain}>{heroMain}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
        </LinearGradient>
      </View>

      {/* クイックアクション */}
      <View style={styles.quickRow}>
        <Link href="/assignments" asChild>
          <Pressable style={styles.quickItem}>
            <SymbolView name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} tintColor={Colors.accent} size={22} />
            <Text style={styles.quickLabel}>課題</Text>
          </Pressable>
        </Link>
        <Link href="/announcements" asChild>
          <Pressable style={styles.quickItem}>
            <SymbolView name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} tintColor={Colors.accent} size={22} />
            <Text style={styles.quickLabel}>お知らせ</Text>
          </Pressable>
        </Link>
        <Link href="/import" asChild>
          <Pressable style={styles.quickItem}>
            <SymbolView name={{ ios: 'square.and.arrow.down', android: 'file_download', web: 'file_download' }} tintColor={Colors.blue} size={22} />
            <Text style={styles.quickLabel}>取り込み</Text>
          </Pressable>
        </Link>
      </View>

      {/* 今日の時間割 */}
      {lessons && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>今日の時間割</Text>
            <View style={styles.softPill}>
              <Text style={styles.softPillText}>{weekdayLabel(now)}曜日</Text>
            </View>
          </View>
          <View style={styles.lessonList}>
            {lessons.map((row) => (
              <View key={row.period.label} style={styles.lessonRow}>
                <View style={[styles.subjectDot, { backgroundColor: row.subject ? subjectColor(row.subject) : Colors.border }]} />
                <View style={styles.lessonMain}>
                  <Text style={styles.lessonSubject}>
                    {row.changed && row.subject === null
                      ? '休講'
                      : (row.subject ?? (row.period.label === 'HR' ? 'ホームルーム' : '未設定'))}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {row.period.label} ・ {row.period.start}–{row.period.end}
                  </Text>
                </View>
                {row.changed && (
                  <View style={styles.changedPill}>
                    <Text style={styles.changedPillText}>変更</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          {hasSampleSubjects(now) && !isCustomDay(subjectsMap, weekdayLabel(now)) && (
            <Text style={styles.note}>※ 科目はサンプルです（時間割タブで自分の科目に変更できます）</Text>
          )}
        </View>
      )}

      {/* 今日のゼミ */}
      {todayZemi.length > 0 && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>今日のゼミ</Text>
            <View style={[styles.softPill, { backgroundColor: Colors.blueSoft }]}>
              <Text style={[styles.softPillText, { color: Colors.blue }]}>ゼミ</Text>
            </View>
          </View>
          {todayZemi.map((z) => (
            <View key={z.id} style={styles.lessonRow}>
              <View style={[styles.subjectDot, { backgroundColor: Colors.blue }]} />
              <View style={styles.lessonMain}>
                <Text style={styles.lessonSubject}>{z.name}</Text>
                <Text style={styles.lessonMeta}>
                  {z.start}–{z.end}
                  {z.place ? ` ・ ${z.place}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 期限が近い課題 */}
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
              <View style={[styles.duePill, d <= 0 && styles.duePillOverdue]}>
                <Text style={[styles.duePillText, d <= 0 && styles.duePillTextOverdue]}>
                  {d < 0 ? `${-d}日超過` : d === 0 ? '今日まで' : `あと${d}日`}
                </Text>
              </View>
            </View>
          );
        })}
        <Link href="/assignments" asChild>
          <Pressable style={styles.darkButton}>
            <Text style={styles.darkButtonText}>課題を管理する</Text>
          </Pressable>
        </Link>
      </View>

      {/* 直近の時間割変更 */}
      {nearExceptions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>直近の時間割変更</Text>
          {nearExceptions.map((e) => (
            <Text key={e.id} style={styles.note}>
              {(() => {
                const d = new Date(`${e.date}T00:00:00`);
                return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
              })()} {e.periodLabel}：{e.subject === null ? '休講' : e.subject}
              {e.note ? `（${e.note}）` : ''}
            </Text>
          ))}
        </View>
      )}

      {/* 次の行事 */}
      {nextEv && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>次の行事・予定</Text>
          <View style={styles.eventRow}>
            <View style={styles.countBox}>
              <Text style={styles.countNum}>{nextEv.inDays === 0 ? '今日' : nextEv.inDays}</Text>
              {nextEv.inDays > 0 && <Text style={styles.countUnit}>日後</Text>}
            </View>
            <View style={styles.eventMain}>
              <Text style={styles.eventTitle}>{nextEv.title}</Text>
              <Text style={styles.note}>
                {(() => {
                  const d = new Date(`${nextEv.date}T00:00:00`);
                  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
                })()}
                {nextEv.time ? ` ${nextEv.time}` : ''}
                {nextEv.place ? ` ・ ${nextEv.place}` : ''}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* お知らせ */}
      {latestAnnouncement && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>お知らせ</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>未読 {unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.eventTitle}>{latestAnnouncement.title}</Text>
          <Link href="/announcements" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkButtonText}>お知らせを見る</Text>
            </Pressable>
          </Link>
        </View>
      )}

      <Text style={styles.footer}>このアプリは生徒有志による非公式アプリです。学校公式のものではありません。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { gap: 2, marginTop: Spacing.sm },
  appName: { fontSize: FontSize.caption, color: Colors.subText, fontWeight: '600', letterSpacing: 1 },
  greeting: { fontSize: FontSize.display, fontWeight: '700', color: Colors.text },
  dateLine: { fontSize: FontSize.small, color: Colors.subText },
  heroWrap: { borderRadius: Radius.xl, ...HeroShadow },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  heroDeco1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -70,
    right: -40,
  },
  heroDeco2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.14)',
    bottom: -50,
    left: 30,
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  heroPillText: { fontSize: FontSize.caption, color: Colors.white, fontWeight: '700' },
  heroMain: { fontSize: FontSize.title, fontWeight: '700', color: Colors.white, lineHeight: 30 },
  heroSub: { fontSize: FontSize.small, color: 'rgba(255,255,255,0.92)' },
  quickRow: { flexDirection: 'row', gap: Spacing.md },
  quickItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow,
  },
  quickLabel: { fontSize: FontSize.caption, color: Colors.text, fontWeight: '600' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadow,
  },
  cardTitle: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 19 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  softPill: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  softPillText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  lessonList: { gap: Spacing.md },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  lessonMain: { flex: 1, gap: 1 },
  lessonSubject: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text },
  lessonMeta: { fontSize: FontSize.caption, color: Colors.subText },
  changedPill: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  changedPillText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  assignmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  assignmentTitle: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  duePill: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  duePillText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  duePillOverdue: { backgroundColor: Colors.dangerSoft },
  duePillTextOverdue: { color: Colors.danger },
  darkButton: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  darkButtonText: { fontSize: FontSize.body, color: Colors.white, fontWeight: '700' },
  linkButton: { marginTop: Spacing.xs },
  linkButtonText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '700' },
  unreadChip: { backgroundColor: Colors.accent, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  unreadChipText: { fontSize: FontSize.caption, color: Colors.white, fontWeight: '700' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  countBox: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    width: 72,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  countNum: { fontSize: FontSize.display, fontWeight: '700', color: Colors.accent },
  countUnit: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  eventMain: { flex: 1, gap: 2 },
  eventTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.sm },
});
