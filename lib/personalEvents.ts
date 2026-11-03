import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { newId } from '@/lib/assignments';

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

export function usePersonalEvents() {
  const [items, setItems] = useState<PersonalEvent[]>([]);
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

  const persist = useCallback((next: PersonalEvent[]) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
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
