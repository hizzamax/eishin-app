import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { useAnnouncements } from '@/lib/announcements';

function dateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function AnnouncementsScreen() {
  const { items, unreadCount, markRead, markAllRead } = useAnnouncements();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.heading}>お知らせ</Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.linkText}>すべて既読にする</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.note}>
        アプリからのお知らせです。学校公式のお知らせではありません。未読 {unreadCount} 件（タップで既読になります）
      </Text>

      {items.map((a) => (
        <Pressable key={a.id} onPress={() => markRead(a.id)} style={[styles.card, !a.read && styles.cardUnread]}>
          <View style={styles.rowBetween}>
            <Text style={styles.date}>{dateLabel(a.date)}</Text>
            {!a.read ? (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>未読</Text>
              </View>
            ) : a.important ? (
              <Text style={styles.importantText}>重要</Text>
            ) : null}
          </View>
          <Text style={[styles.title, !a.read && styles.titleUnread]}>{a.title}</Text>
          <Text style={styles.body}>{a.body}</Text>
        </Pressable>
      ))}

      <Text style={styles.footer}>
        学校からの正式なお知らせは、学校の案内やスタディサプリなどで確認してください。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: '600' },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow,
  },
  cardUnread: { borderColor: Colors.accent },
  date: { fontSize: FontSize.small, color: Colors.subText },
  unreadChip: { backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  unreadChipText: { fontSize: FontSize.caption, color: '#FFFFFF', fontWeight: '700' },
  importantText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '700' },
  title: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text },
  titleUnread: { fontWeight: '700' },
  body: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});
