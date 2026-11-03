import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SAMPLE_SUBJECTS, type WeekdayLabel } from '@/data/seed';

/**
 * 曜日ごとの通常科目（1限・2限・3限の順、nullは未設定）。
 * 初期状態ではサンプル科目が表示されるが、利用者が自分の科目を登録すると
 * その曜日は登録内容が優先される。登録した科目は端末に保存される。
 */
export type SubjectsMap = Partial<Record<WeekdayLabel, (string | null)[]>>;

const KEY = 'eishin.subjects.v1';
export const LESSON_COUNT = 3;

export async function loadSubjectsMap(): Promise<SubjectsMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as SubjectsMap) : {};
  } catch {
    return {};
  }
}

export async function saveSubjectsMap(map: SubjectsMap): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

/** その曜日に表示する科目（登録済みがあればそれ、なければサンプル、それもなければ undefined） */
export function effectiveSubjects(map: SubjectsMap, weekday: WeekdayLabel): (string | null)[] | undefined {
  const custom = map[weekday];
  if (Array.isArray(custom)) return custom;
  const sample = SAMPLE_SUBJECTS[weekday];
  return sample ? [...sample] : undefined;
}

/** その曜日が利用者の登録済みかどうか（サンプル表示ではないか） */
export function isCustomDay(map: SubjectsMap, weekday: WeekdayLabel): boolean {
  return Array.isArray(map[weekday]);
}

export function useSubjects() {
  const [map, setMap] = useState<SubjectsMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSubjectsMap().then((m) => {
      if (alive) {
        setMap(m);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: SubjectsMap) => {
    setMap(next);
    saveSubjectsMap(next).catch(() => {});
  }, []);

  /** 1限ぶんの科目を書き換える（空文字は未設定にする） */
  const setSubject = useCallback(
    (weekday: WeekdayLabel, index: number, subject: string) => {
      const current = effectiveSubjects(map, weekday) ?? [null, null, null];
      const nextArr = [...current];
      while (nextArr.length < LESSON_COUNT) nextArr.push(null);
      nextArr[index] = subject.trim() ? subject.trim() : null;
      persist({ ...map, [weekday]: nextArr });
    },
    [map, persist],
  );

  /** その曜日をサンプル表示に戻す（登録がなければ何もしない） */
  const resetDay = useCallback(
    (weekday: WeekdayLabel) => {
      if (!isCustomDay(map, weekday)) return;
      const next = { ...map };
      delete next[weekday];
      persist(next);
    },
    [map, persist],
  );

  return { map, loaded, setSubject, resetDay };
}
