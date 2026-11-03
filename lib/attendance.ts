import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { WeekdayLabel } from '@/data/seed';
import { isClassDay, toDateKey, weekdayLabel } from '@/lib/school';

/** 登校予定の種別：登校／自宅学習／休み */
export type AttendanceKind = 'school' | 'home' | 'off';

export const ATTENDANCE_LABEL: Record<AttendanceKind, string> = {
  school: '登校',
  home: '自宅学習',
  off: '休み',
};

/** 日付キー → 種別 の上書きマップ */
export type AttendanceMap = Record<string, AttendanceKind>;

const KEY = 'eishin.attendance.v1';

/** 上書きがなければ、授業曜日かどうかで既定値を決める */
export function effectiveKind(date: Date, classDays: WeekdayLabel[], map: AttendanceMap): AttendanceKind {
  const override = map[toDateKey(date)];
  if (override) return override;
  return isClassDay(date, classDays) ? 'school' : 'off';
}

export function useAttendance() {
  const [map, setMap] = useState<AttendanceMap>({});
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') setMap(parsed as AttendanceMap);
          } catch {
            // 壊れたデータは無視して既定値で動く
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  /** kind=null で上書きを消す */
  const setFor = useCallback(
    (dateKey: string, kind: AttendanceKind | null) => {
      setMap((prev) => {
        const next = { ...prev };
        if (kind === null) delete next[dateKey];
        else next[dateKey] = kind;
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  return { map, loaded, setFor };
}

export function dateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayLabel(d)}）`;
}
