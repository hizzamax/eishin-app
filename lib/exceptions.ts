import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { newId } from '@/lib/assignments';
import { toDateKey, type LessonRow } from '@/lib/school';

/**
 * 特定の日だけの時間割変更（例外）。
 * subject=null は休講を表す。
 */
export type TimetableException = {
  id: string;
  date: string; // "2026-11-06"
  periodLabel: string; // "1限" など
  subject: string | null;
  note: string;
};

const KEY = 'eishin.exceptions.v1';

async function loadAll(): Promise<TimetableException[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 例外を適用した授業行を返す（変更があった行には changed=true） */
export type AppliedRow = LessonRow & { changed: boolean; exceptionNote: string };

export function applyExceptions(rows: LessonRow[], date: Date, exceptions: TimetableException[]): AppliedRow[] {
  const key = toDateKey(date);
  return rows.map((row) => {
    const ex = exceptions.find((e) => e.date === key && e.periodLabel === row.period.label);
    if (!ex) return { ...row, changed: false, exceptionNote: '' };
    return { ...row, subject: ex.subject, changed: true, exceptionNote: ex.note };
  });
}

/** from以降の例外を日付順に */
export function upcomingExceptions(exceptions: TimetableException[], from: Date): TimetableException[] {
  const key = toDateKey(from);
  return exceptions
    .filter((e) => e.date >= key)
    .sort((a, b) => a.date.localeCompare(b.date) || a.periodLabel.localeCompare(b.periodLabel));
}

export function useExceptions() {
  const [items, setItems] = useState<TimetableException[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAll().then((list) => {
      if (alive) {
        setItems(list);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: TimetableException[]) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  /** 同じ日・時限の例外があれば上書き、なければ追加 */
  const upsert = useCallback(
    (draft: Omit<TimetableException, 'id'>) => {
      const existing = items.find((e) => e.date === draft.date && e.periodLabel === draft.periodLabel);
      if (existing) {
        persist(items.map((e) => (e.id === existing.id ? { ...e, ...draft } : e)));
      } else {
        persist([...items, { ...draft, id: newId() }]);
      }
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((e) => e.id !== id));
    },
    [items, persist],
  );

  return { items, loaded, upsert, remove };
}
