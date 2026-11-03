import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { isBackupCode, restoreBackupCode } from '@/lib/backup';
import {
  importCandidatesAsPersonalEvents,
  looksLikeICS,
  parseICS,
  parseScheduleCSV,
  type ImportCandidate,
} from '@/lib/fileImport';
import {
  formatImportAt,
  IMPORT_SOURCE_LABEL,
  loadImportHistory,
  recordImport,
  useImportHistory,
  type ImportSource,
} from '@/lib/importHistory';

export default function ImportScreen() {
  const { records, setRecords } = useImportHistory();
  const [pasteText, setPasteText] = useState('');
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [source, setSource] = useState<ImportSource>('ics');
  const [parseNote, setParseNote] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const analyze = (text: string, forced?: ImportSource, fileName?: string) => {
    setError('');
    setResult('');
    const isICS = forced ? forced === 'ics' : looksLikeICS(text);
    const parsed = isICS ? parseICS(text) : parseScheduleCSV(text);
    setSource(isICS ? 'ics' : 'csv');
    setCandidates(parsed.candidates);
    setParseNote(
      `${fileName ? `${fileName}：` : ''}${parsed.candidates.length}件の予定が見つかりました` +
        (parsed.skipped > 0 ? `（読み取れなかった行 ${parsed.skipped}件）` : '') +
        '。内容を確認してから取り込んでください。',
    );
    if (parsed.candidates.length === 0) {
      setError('予定が1件も読み取れませんでした。ファイルの形式を確認してください。');
    }
  };

  const [backupText, setBackupText] = useState('');
  const [backupResult, setBackupResult] = useState('');
  const [backupError, setBackupError] = useState('');

  const doRestore = async () => {
    setBackupError('');
    setBackupResult('');
    if (!isBackupCode(backupText)) {
      setBackupError('EISHIN-BACKUP1. で始まるバックアップコードを貼り付けてください');
      return;
    }
    try {
      const r = await restoreBackupCode(backupText);
      await recordImport({ source: 'backup', added: r.restoredKeys, skipped: 0, note: 'バックアップから復元' });
      setRecords(await loadImportHistory());
      setBackupResult(`復元しました（${r.restoredKeys}種類のデータ）。各タブを開き直すと反映されます。現在のデータは上書きされます。`);
      setBackupText('');
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : '復元に失敗しました');
    }
  };

  const pickFile = async () => {
    setError('');
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/calendar', 'text/csv', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      const text = await new File(asset.uri).text();
      const lower = asset.name.toLowerCase();
      const forced: ImportSource = lower.endsWith('.ics') ? 'ics' : lower.endsWith('.csv') ? 'csv' : looksLikeICS(text) ? 'ics' : 'csv';
      analyze(text, forced, asset.name);
    } catch {
      setError('ファイルを開けませんでした');
    }
  };

  const doImport = async () => {
    if (!candidates || candidates.length === 0) return;
    const r = await importCandidatesAsPersonalEvents(candidates);
    await recordImport({
      source,
      added: r.added,
      skipped: r.skippedDup,
      note: `${IMPORT_SOURCE_LABEL[source]}から取り込み`,
    });
    setRecords(await loadImportHistory());
    setResult(
      `${r.added}件を取り込みました` +
        (r.skippedDup > 0 ? `（重複 ${r.skippedDup}件は除きました）` : '') +
        '。カレンダーに「個人」の予定として表示されます。',
    );
    setCandidates(null);
    setParseNote('');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ファイルから取り込む</Text>
        <Text style={styles.note}>
          ICS（カレンダー）ファイルと、CSVファイル（日付,タイトル,時間，場所の順）に対応しています。取り込んだ予定は「個人の予定」として保存されます。
        </Text>
        <Pressable onPress={pickFile} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>ファイルを選ぶ（.ics / .csv）</Text>
        </Pressable>
        <Text style={styles.label}>または、内容を貼り付け</Text>
        <TextInput
          style={[styles.input, styles.pasteInput]}
          value={pasteText}
          onChangeText={setPasteText}
          placeholder="ICSやCSVの内容をここに貼り付け"
          placeholderTextColor={Colors.subText}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Pressable
          onPress={() => pasteText.trim() && analyze(pasteText)}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>貼り付けた内容を解析する</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {candidates && candidates.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>取り込み内容の確認</Text>
          {parseNote ? <Text style={styles.note}>{parseNote}</Text> : null}
          {candidates.slice(0, 30).map((c, i) => (
            <Text key={i} style={styles.candidate}>
              {c.date} {c.time ? `${c.time} ` : ''}
              {c.title}
              {c.place ? ` ・ ${c.place}` : ''}
            </Text>
          ))}
          {candidates.length > 30 && <Text style={styles.note}>…ほか {candidates.length - 30} 件</Text>}
          <Pressable onPress={doImport} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>この内容で取り込む</Text>
          </Pressable>
          <Pressable onPress={() => { setCandidates(null); setParseNote(''); }} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>やめる</Text>
          </Pressable>
        </View>
      )}
      {result ? (
        <View style={styles.card}>
          <Text style={styles.success}>{result}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>バックアップから復元</Text>
        <Text style={styles.note}>
          設定タブで作ったバックアップコードを貼り付けると、この端末のデータを復元します。今あるデータは上書きされるので注意してください。
        </Text>
        <TextInput
          style={[styles.input, styles.pasteInput]}
          value={backupText}
          onChangeText={setBackupText}
          placeholder="EISHIN-BACKUP1. で始まるコードを貼り付け"
          placeholderTextColor={Colors.subText}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        {backupError ? <Text style={styles.error}>{backupError}</Text> : null}
        {backupResult ? <Text style={styles.success}>{backupResult}</Text> : null}
        <Pressable onPress={doRestore} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>復元する</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>取り込み履歴</Text>
      {records.length === 0 && <Text style={styles.note}>まだ取り込み履歴はありません。</Text>}
      {records.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.noteDark}>
            {formatImportAt(r.at)} ・ {IMPORT_SOURCE_LABEL[r.source]}
          </Text>
          <Text style={styles.note}>
            {r.added}件を取り込み
            {r.skipped > 0 ? `、${r.skipped}件を読み飛ばし` : ''}
            {r.note ? `（${r.note}）` : ''}
          </Text>
        </View>
      ))}
      <Text style={styles.footer}>
        学校の公開ページからの自動取得は、内容の正確さを確認できないため行っていません。配布されたファイルを取り込む形にしています。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
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
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  noteDark: { fontSize: FontSize.body, color: Colors.text },
  candidate: { fontSize: FontSize.small, color: Colors.text, lineHeight: 20 },
  label: { fontSize: FontSize.small, color: Colors.subText, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.small,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  pasteInput: { minHeight: 96, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { color: Colors.subText, fontSize: FontSize.body },
  error: { color: Colors.danger, fontSize: FontSize.small, lineHeight: 20 },
  success: { color: Colors.success, fontSize: FontSize.body, lineHeight: 22 },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});
