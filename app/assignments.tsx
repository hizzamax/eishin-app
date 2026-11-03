import { SymbolView } from 'expo-symbols';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
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
import { confirmAction } from '@/lib/confirm';
import { DateField } from '@/components/Pickers';

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  todo: '未着手',
  doing: '進行中',
  done: '提出済み',
};
const STATUS_ORDER: AssignmentStatus[] = ['todo', 'doing', 'done'];
const STATUS_CHIP: Record<AssignmentStatus, { bg: string; fg: string }> = {
  todo: { bg: Colors.accentSoft, fg: Colors.accent },
  doing: { bg: Colors.blueSoft, fg: Colors.blue },
  done: { bg: Colors.subBackground, fg: Colors.subText },
};

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
  const [editingStatus, setEditingStatus] = useState<AssignmentStatus>('todo');
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const today = useMemo(() => new Date(), []);
  const list = useMemo(() => sortedAssignments(items), [items]);

  const closeForm = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setError('');
    setFormOpen(false);
  };

  const onSubmit = () => {
    if (!draft.title.trim()) {
      setError('課題名を入力してください');
      return;
    }
    if (!isValidDateKey(draft.dueDate)) {
      setError('提出期限を選択してください');
      return;
    }
    if (editingId) {
      update(editingId, { ...draft, title: draft.title.trim(), status: editingStatus });
    } else {
      add({ ...draft, title: draft.title.trim(), status: 'todo', memo: '' });
    }
    closeForm();
  };

  const onEdit = (a: Assignment) => {
    setEditingId(a.id);
    setEditingStatus(a.status);
    setDraft({ title: a.title, subject: a.subject, dueDate: a.dueDate, detail: a.detail });
    setError('');
    setFormOpen(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const showForm = formOpen || editingId !== null;

  return (
    <ScrollView ref={scrollRef} style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>
          課題一覧{list.length > 0 ? <Text style={styles.headingCount}> {list.length}件</Text> : null}
        </Text>
        {!showForm && (
          <Pressable onPress={() => setFormOpen(true)} style={styles.addButton}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={Colors.white} size={16} />
            <Text style={styles.addButtonText}>追加</Text>
          </Pressable>
        )}
      </View>

      {showForm && (
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
          <Text style={styles.label}>提出期限 *</Text>
          <DateField
            value={draft.dueDate}
            onChange={(dueDate) => setDraft({ ...draft, dueDate })}
            placeholder="日付を選択"
          />
          <Text style={styles.label}>内容・メモ</Text>
          <TextInput
            style={styles.input}
            value={draft.detail}
            onChangeText={(detail) => setDraft({ ...draft, detail })}
            placeholder="任意"
            placeholderTextColor={Colors.subText}
          />
          {editingId && (
            <>
              <Text style={styles.label}>状態</Text>
              <View style={styles.chipRow}>
                {STATUS_ORDER.map((s) => {
                  const active = editingStatus === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setEditingStatus(s)}
                      style={[styles.statusSelectChip, active && styles.statusSelectChipActive]}>
                      <Text style={[styles.statusSelectText, active && styles.statusSelectTextActive]}>
                        {STATUS_LABEL[s]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={onSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{editingId ? '更新する' : '追加する'}</Text>
          </Pressable>
          <Pressable onPress={closeForm} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>{editingId ? '編集をやめる' : '閉じる'}</Text>
          </Pressable>
        </View>
      )}

      {list.length === 0 && !showForm && (
        <View style={styles.emptyCard}>
          <SymbolView name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} tintColor={Colors.accentSub} size={40} />
          <Text style={styles.emptyTitle}>課題は登録されていません</Text>
          <Text style={styles.note}>右上の「追加」から登録できます。</Text>
        </View>
      )}
      {list.map((a) => {
        const chip = STATUS_CHIP[a.status];
        const overdue = a.status !== 'done' && daysUntil(a.dueDate, today) < 0;
        return (
          <View key={a.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{a.title}</Text>
              <Pressable
                onPress={() => onEdit(a)}
                hitSlop={6}
                style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.statusText, { color: chip.fg }]}>{STATUS_LABEL[a.status]}</Text>
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
              <Pressable
                onPress={() =>
                  confirmAction('課題を削除しますか？', `「${a.title}」を削除します。`, () => remove(a.id))
                }
                style={styles.smallButton}>
                <Text style={styles.smallButtonDanger}>削除</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text style={styles.footer}>状態は、課題を編集する画面で変更できます。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  headingCount: { fontSize: FontSize.small, fontWeight: '400', color: Colors.subText },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addButtonText: { color: Colors.white, fontSize: FontSize.small, fontWeight: '600' },
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
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  statusSelectChip: {
    flex: 1,
    minHeight: 38,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSelectChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  statusSelectText: { fontSize: FontSize.small, color: Colors.subText, fontWeight: '600' },
  statusSelectTextActive: { color: Colors.white },
  primaryButton: { backgroundColor: Colors.dark, borderRadius: Radius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  primaryButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { color: Colors.subText, fontSize: FontSize.body },
  error: { color: Colors.danger, fontSize: FontSize.small },
  note: { fontSize: FontSize.small, color: Colors.subText },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
    ...Shadow,
  },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text },
  itemTitle: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  statusChip: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  statusText: { fontSize: FontSize.caption, fontWeight: '700' },
  smallButton: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  smallButtonText: { fontSize: FontSize.small, color: Colors.text },
  smallButtonDanger: { fontSize: FontSize.small, color: Colors.danger },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.sm },
});
