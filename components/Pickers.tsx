import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import { toDateKey, weekdayLabel } from '@/lib/school';

/**
 * 日付・時刻を手入力ではなくタップで選ぶための共通部品。
 * どちらも入力欄風のボタンを表示し、タップでモーダルを開く。
 */

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateLabel(value: string): string {
  const d = parseDateKey(value);
  if (!d) return value;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
}

// ---------------- 日付 ----------------

export function DateField({
  value,
  onChange,
  placeholder = '日付を選択',
  style,
}: {
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = parseDateKey(value) ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  const openPicker = () => {
    const base = parseDateKey(value) ?? new Date();
    setView({ y: base.getFullYear(), m: base.getMonth() });
    setOpen(true);
  };

  const moveMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.y, view.m, i + 1)),
  ];
  const todayKey = toDateKey(new Date());

  return (
    <>
      <Pressable onPress={openPicker} style={[styles.field, style]}>
        <Text style={value ? styles.fieldText : styles.fieldPlaceholder}>{value ? formatDateLabel(value) : placeholder}</Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => moveMonth(-1)} style={styles.navCircle} hitSlop={6}>
                <Text style={styles.navArrow}>‹</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>
                {view.y}年{view.m + 1}月
              </Text>
              <Pressable onPress={() => moveMonth(1)} style={styles.navCircle} hitSlop={6}>
                <Text style={styles.navArrow}>›</Text>
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
                <Text key={w} style={[styles.weekCell, i === 0 && styles.weekSun, i === 6 && styles.weekSat]}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((d, i) => {
                if (!d) return <View key={`e-${i}`} style={styles.cell} />;
                const key = toDateKey(d);
                const selected = key === value;
                const isToday = key === todayKey;
                return (
                  <Pressable
                    key={key}
                    style={styles.cell}
                    onPress={() => {
                      onChange(key);
                      setOpen(false);
                    }}>
                    <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                      <Text style={[styles.dayText, isToday && !selected && styles.dayToday, selected && styles.dayTextSelected]}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setOpen(false)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ---------------- 時刻 ----------------

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

export function TimeField({
  value,
  onChange,
  placeholder = '時刻を選択',
  style,
  initialHint,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  /** 未入力のときに最初に選ばれている時刻（例：終了時刻は開始の1時間後） */
  initialHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(15);
  const [minute, setMinute] = useState(0);

  const openPicker = () => {
    const target = value || initialHint || '';
    const m = target.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      setHour(Math.min(23, Math.max(0, Number(m[1]))));
      setMinute(Math.min(55, Math.round(Number(m[2]) / 5) * 5));
    } else {
      setHour(15);
      setMinute(0);
    }
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={openPicker} style={[styles.field, style]}>
        <Text style={value ? styles.fieldText : styles.fieldPlaceholder}>{value || placeholder}</Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>時刻を選択</Text>
            <ScrollView style={styles.timeScroll}>
              <Text style={styles.pickerLabel}>時</Text>
              <View style={styles.chipWrap}>
                {HOURS.map((h) => (
                  <Pressable key={h} onPress={() => setHour(h)} style={[styles.timeChip, hour === h && styles.timeChipActive]}>
                    <Text style={[styles.timeChipText, hour === h && styles.timeChipTextActive]}>{h}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.pickerLabel}>分</Text>
              <View style={styles.chipWrap}>
                {MINUTES.map((mm) => (
                  <Pressable key={mm} onPress={() => setMinute(mm)} style={[styles.timeChip, minute === mm && styles.timeChipActive]}>
                    <Text style={[styles.timeChipText, minute === mm && styles.timeChipTextActive]}>{pad(mm)}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Pressable onPress={() => setOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(`${pad(hour)}:${pad(minute)}`);
                  setOpen(false);
                }}
                style={styles.doneButton}>
                <Text style={styles.doneText}>決定（{pad(hour)}:{pad(minute)}）</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    minWidth: 0,
  },
  fieldText: { fontSize: FontSize.body, color: Colors.text },
  fieldPlaceholder: { fontSize: FontSize.body, color: Colors.subText },
  caret: { fontSize: FontSize.small, color: Colors.subText, marginLeft: Spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '85%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  navCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.subBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 18, color: Colors.text, lineHeight: 20 },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: `${100 / 7}%`, textAlign: 'center', fontSize: FontSize.caption, color: Colors.subText },
  weekSun: { color: Colors.sunday },
  weekSat: { color: Colors.blue },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: Colors.accent },
  dayText: { fontSize: FontSize.body, color: Colors.text },
  dayToday: { color: Colors.accent, fontWeight: '700' },
  dayTextSelected: { color: Colors.white, fontWeight: '700' },
  pickerLabel: { fontSize: FontSize.small, color: Colors.subText, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  timeScroll: { flexGrow: 0 },
  timeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.background,
  },
  timeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  timeChipText: { fontSize: FontSize.body, color: Colors.text },
  timeChipTextActive: { color: Colors.white, fontWeight: '700' },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  cancelText: { fontSize: FontSize.body, color: Colors.text },
  doneButton: {
    backgroundColor: Colors.text,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  doneText: { fontSize: FontSize.body, color: Colors.white, fontWeight: '700' },
});
