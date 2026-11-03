import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { newId } from '@/lib/assignments';

/** データ取り込みの履歴（SPEC 6章：取得元の記録・最終取得日時・更新履歴） */
export type ImportSource = 'ics' | 'csv' | 'community' | 'share-code' | 'backup';

export const IMPORT_SOURCE_LABEL: Record<ImportSource, string> = {
  ics: 'ICSファイル',
  csv: 'CSVファイル',
  community: 'コミュニティ',
  'share-code': '共有コード',
  backup: 'バックアップ復元',
};

export type ImportRecord = {
  id: string;
  at: string; // ISO文字列
  source: ImportSource;
  added: number;
  skipped: number;
  note: string;
};

const KEY = 'eishin.importHistory.v1';
const MAX_RECORDS = 50;

export async function loadImportHistory(): Promise<ImportRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function recordImport(rec: Omit<ImportRecord, 'id' | 'at'>): Promise<void> {
  try {
    const list = await loadImportHistory();
    const next = [{ ...rec, id: newId(), at: new Date().toISOString() }, ...list].slice(0, MAX_RECORDS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 履歴の保存に失敗しても取り込み自体は止めない
  }
}

export function useImportHistory() {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const reload = useCallback(() => {
    loadImportHistory().then(setRecords);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return { records, setRecords };
}

export function formatImportAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}
