import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { syncNotifications } from '@/lib/notifications';

export type AssignmentStatus = 'todo' | 'doing' | 'done';

export type Assignment = {
  id: string;
  title: string;
  subject: string;
  detail: string;
  dueDate: string; // "2026-11-10"
  status: AssignmentStatus;
  memo: string;
};

const KEY = 'eishin.assignments.v1';

export function newId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function isValidDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = s.split('-').map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

/** 期限まであと何日か（負なら期限切れ） */
export function daysUntil(dueDate: string, from: Date): number {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - base.getTime()) / 86400000);
}

async function loadAll(): Promise<Assignment[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAll(items: Assignment[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

/** 未完了を期限順に並べた一覧 */
export function sortedAssignments(items: Assignment[]): Assignment[] {
  return [...items].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/** ホーム表示用：未完了で期限が近いもの */
export function urgentAssignments(items: Assignment[], limit: number): Assignment[] {
  return sortedAssignments(items.filter((a) => a.status !== 'done')).slice(0, limit);
}

export function useAssignments() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    loadAll().then((list) => {
      setItems(list);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 他の画面で変更・復元された内容を、タブを開き直したときに反映する
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const persist = useCallback((next: Assignment[]) => {
    setItems(next);
    saveAll(next)
      .then(() => syncNotifications({ assignments: next }))
      .catch(() => {});
  }, []);

  const add = useCallback(
    (draft: Omit<Assignment, 'id'>) => {
      persist([...items, { ...draft, id: newId() }]);
    },
    [items, persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Assignment>) => {
      persist(items.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((a) => a.id !== id));
    },
    [items, persist],
  );

  const removeMany = useCallback(
    (ids: string[]) => {
      persist(items.filter((a) => !ids.includes(a.id)));
    },
    [items, persist],
  );

  return { items, loaded, add, update, remove, removeMany };
}
