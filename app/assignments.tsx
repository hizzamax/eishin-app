import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import {
  daysUntil,
  isValidDateKey,
  sortedAssignments,
  useAssignments,
  type Assignment,
  type AssignmentStatus,
} from '@/lib/assignments';

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  todo: '未着手',
  doing: '進行中',
  done: '提出済み',
};
const STATUS_ORDER: AssignmentStatus[] = ['todo', 'doing', 'done'];

function dueLabel(a: Assignment, today: Date): string {
  if (a.status === 'done') return '提出済み';
  const d = daysUntil(a.dueDate, today);
  if (d < 0) return `${-d}日過ぎています`;
  if (d === 0) return '今日まで';
  if (d === 1) return '明日まで';
  return `あと${d}日`;
}

type Draft = { title: string; subject: string; dueDate: string; detail: string };

const EMPTY: Draft = { title: '', subject: '', dueDate: '', detail: '' };

export default function AssignmentsScreen() {
  const { items, add, update, remove } = useAssignments();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const today = useMemo(() => new Date(), []);
  const list = useMemo(() => sortedAssignments(items), [items]);

  const onSubmit = () => {
    if (!draft.title.trim()) {
      setError('課題名を入力してください');
      return;
    }
    if (!isValidDateKey(draft.dueDate)) {
      setError('提出期限は 2026-11-10 の形式で入力してください');
      return;
    }
    if (editingId) {
      update(editingId, { ...draft, title: draft.title.trim() });
      setEditingId(null);
    } else {
      add({ ...draft, title: draft.title.trim(), status: 'todo', memo: '' });
    }
    setDraft(EMPTY);
    setError('');
  };

  const onEdit = (a: Assignment) => {
    setEditingId(a.id);
    setDraft({ title: a.title, subject: a.subject, dueDate: a.dueDate, detail: a.detail });
    setError('');
  };

  const cycleStatus = (a: Assignment) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(a.status) + 1) % STATUS_ORDER.length];
    update(a.id, { status: next });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingId ? '課題を編集' : '課題を追加'}</Text>
        <Text style={styles.label}>課題名 *</Text>
        <TextInput
          style={styles.input}
          value={draft.title}
          onChangeText={(title) => setDraft({ ...draft, title })}
          placeholder="例：数学II レポート"
          placeholderTextColor={Colors.subText}
        />
        <Text style={styles.label}>科目</Text>
        <TextInput
          style={styles.input}
          value={draft.subject}
          onChangeText={(subject) => setDraft({ ...draft, subject })}
          placeholder="例：数学II"
          placeholderTextColor={Colors.subText}
        />
        <Text style={styles.label}>提出期限 *（YYYY-MM-DD）</Text>
        <TextInput
          style={styles.input}
          value={draft.dueDate}
          onChangeText={(dueDate) => setDraft({ ...draft, dueDate })}
          placeholder="2026-11-10"
          placeholderTextColor={Colors.subText}
          autoCapitalize="none"
        />
        <Text style={styles.label}>内容・メモ</Text>
        <TextInput
          style={styles.input}
          value={draft.detail}
          onChangeText={(detail) => setDraft({ ...draft, detail })}
          placeholder="任意"
          placeholderTextColor={Colors.subText}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={onSubmit} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{editingId ? '更新する' : '追加する'}</Text>
        </Pressable>
        {editingId && (
          <Pressable
            onPress={() => {
              setEditingId(null);
              setDraft(EMPTY);
              setError('');
            }}
            style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>編集をやめる</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.heading}>課題一覧</Text>
      {list.length === 0 && <Text style={styles.note}>登録されている課題はありません。</Text>}
      {list.map((a) => {
        const overdue = a.status !== 'done' && daysUntil(a.dueDate, today) < 0;
        return (
          <View key={a.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{a.title}</Text>
              <Pressable
                onPress={() => cycleStatus(a)}
                style={[styles.statusChip, a.status === 'done' && styles.statusChipDone]}>
                <Text style={[styles.statusText, a.status === 'done' && styles.statusTextDone]}>
                  {STATUS_LABEL[a.status]}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.note}>
              {a.subject ? `${a.subject} ・ ` : ''}期限 {a.dueDate}（{dueLabel(a, today)}）
            </Text>
            {a.detail ? <Text style={styles.note}>{a.detail}</Text> : null}
            {overdue && <Text style={styles.error}>期限を過ぎています</Text>}
            <View style={styles.row}>
              <Pressable onPress={() => onEdit(a)} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>編集</Text>
              </Pressable>
              <Pressable onPress={() => remove(a.id)} style={styles.smallButton}>
                <Text style={styles.smallButtonDanger}>削除</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text style={styles.footer}>状態のチップを押すと「未着手→進行中→提出済み」と切り替わります。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
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
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
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
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { color: Colors.subText, fontSize: FontSize.body },
  error: { color: Colors.danger, fontSize: FontSize.small },
  note: { fontSize: FontSize.small, color: Colors.subText },
  itemTitle: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  statusChip: { backgroundColor: Colors.accentSoft, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusChipDone: { backgroundColor: Colors.subBackground },
  statusText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '600' },
  statusTextDone: { color: Colors.subText },
  smallButton: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  smallButtonText: { fontSize: FontSize.small, color: Colors.text },
  smallButtonDanger: { fontSize: FontSize.small, color: Colors.danger },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.sm },
});
