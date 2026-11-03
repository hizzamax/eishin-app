import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { newId } from '@/lib/assignments';
import { syncNotifications } from '@/lib/notifications';

export type PersonalEvent = {
  id: string;
  date: string; // "2026-11-10"
  time: string; // "14:00-"（未定なら空文字）
  title: string;
  place: string;
};

const KEY = 'eishin.events.v1';

async function loadAll(): Promise<PersonalEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** ファイル取り込みなどから直接読み書きするためのヘルパー */
export async function loadPersonalAll(): Promise<PersonalEvent[]> {
  return loadAll();
}

export async function savePersonalAll(items: PersonalEvent[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export function usePersonalEvents() {
  const [items, setItems] = useState<PersonalEvent[]>([]);
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

  const persist = useCallback((next: PersonalEvent[]) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next))
      .then(() => syncNotifications({ personalEvents: next }))
      .catch(() => {});
  }, []);

  const add = useCallback(
    (draft: Omit<PersonalEvent, 'id'>) => {
      persist([...items, { ...draft, id: newId() }]);
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((e) => e.id !== id));
    },
    [items, persist],
  );

  return { items, loaded, add, remove };
}
