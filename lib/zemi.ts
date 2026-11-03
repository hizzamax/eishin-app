import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { WeekdayLabel } from '@/data/seed';
import { newId } from '@/lib/assignments';
import { weekdayLabel } from '@/lib/school';

/**
 * ゼミの登録データ。
 * ゼミの定期スケジュールはスタディサプリ等に公開されていないため、
 * 利用者自身が自分のゼミ（名前・曜日・時間・場所）を登録する形にする。
 * 休講など、その日だけの変更は時間割の「特定日の変更」で調整する想定。
 */
export type ZemiEntry = {
  id: string;
  name: string;
  weekday: WeekdayLabel;
  start: string; // "15:00"
  end: string; // "16:00"
  place: string;
};

const KEY = 'eishin.zemi.v1';

async function loadAll(): Promise<ZemiEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 共有機能などから直接読み書きするためのヘルパー */
export async function loadZemiAll(): Promise<ZemiEntry[]> {
  return loadAll();
}

export async function saveZemiAll(items: ZemiEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export function zemiFor(date: Date, entries: ZemiEntry[]): ZemiEntry[] {
  const wd = weekdayLabel(date);
  return entries.filter((z) => z.weekday === wd).sort((a, b) => a.start.localeCompare(b.start));
}

export function zemiForWeekday(weekday: WeekdayLabel, entries: ZemiEntry[]): ZemiEntry[] {
  return entries.filter((z) => z.weekday === weekday).sort((a, b) => a.start.localeCompare(b.start));
}

export function useZemi() {
  const [items, setItems] = useState<ZemiEntry[]>([]);
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

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const persist = useCallback((next: ZemiEntry[]) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const add = useCallback(
    (draft: Omit<ZemiEntry, 'id'>) => {
      persist([...items, { ...draft, id: newId() }]);
    },
    [items, persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<ZemiEntry>) => {
      persist(items.map((z) => (z.id === id ? { ...z, ...patch } : z)));
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((z) => z.id !== id));
    },
    [items, persist],
  );

  return { items, loaded, add, update, remove };
}
