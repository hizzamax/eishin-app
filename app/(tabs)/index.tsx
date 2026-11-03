import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { FREE_DAYS_NOTE } from '@/data/seed';
import { useProfile } from '@/lib/profile';
import { eventDateLabel, formatDate, hasSampleSubjects, isClassDay, lessonsFor, nextEvent, nextLesson } from '@/lib/school';

export default function HomeScreen() {
  const profile = useProfile();
  const now = useMemo(() => new Date(), []);
  const classDays = profile?.classDays ?? ['月', '水', '金'];
  const classDay = isClassDay(now, classDays);
  const lessons = lessonsFor(now, classDays);
  const upcoming = nextLesson(now, classDays);
  const event = nextEvent(now);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{formatDate(now)}</Text>
      <Text style={styles.appName}>英心アプリ（非公式）</Text>
      <Text style={styles.profileLine}>
        {profile ? `${profile.course} ${profile.className}` : '読み込み中…'}
        {profile?.name ? ` ・ ${profile.name}さん` : ''}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{classDay ? '今日は授業日です' : '今日は授業がありません'}</Text>
        {!classDay && <Text style={styles.note}>{FREE_DAYS_NOTE}</Text>}
        {lessons ? (
          <View style={styles.lessonList}>
            {lessons.map(({ period, subject }) => (
              <View key={period.label} style={styles.lessonRow}>
                <Text style={styles.lessonTime}>
                  {period.start}–{period.end}
                </Text>
                <Text style={styles.lessonLabel}>{period.label}</Text>
                <Text style={styles.lessonSubject}>{subject ?? (period.label === 'HR' ? '' : '未設定')}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {lessons && hasSampleSubjects(now) && (
          <Text style={styles.note}>※ 科目はサンプルです（週ごとに変わります）</Text>
        )}
        {upcoming && (
          <Text style={styles.nextLesson}>
            次の授業：{upcoming.row.period.label}
            {upcoming.row.subject ? ` ${upcoming.row.subject}` : ''}（あと{upcoming.inMinutes}分）
          </Text>
        )}
      </View>

      {event && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>次の行事</Text>
          <Text style={styles.eventTitle}>{event.event.title}</Text>
          <Text style={styles.note}>
            {eventDateLabel(event.event)}
            {event.event.time ? ` ${event.event.time}` : ''}
            {event.event.place ? ` ・ ${event.event.place}` : ''}
          </Text>
          <Text style={styles.countdown}>{event.inDays === 0 ? '今日です' : `あと ${event.inDays} 日`}</Text>
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
  nextLesson: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600', marginTop: Spacing.xs },
  eventTitle: { fontSize: FontSize.lead, fontWeight: '600', color: Colors.text },
  countdown: { fontSize: FontSize.display, fontWeight: '700', color: Colors.accent },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md },
});
