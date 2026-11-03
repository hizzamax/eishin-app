import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { isBackupCode, restoreBackupCode } from '@/lib/backup';
import { confirmAction } from '@/lib/confirm';
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
import { importShareCode, parseShareCode } from '@/lib/share';

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
    const recurringNote = isICS && text.includes('RRULE') ? '繰り返し予定は最初の1件だけが取り込まれます。' : '';
    setParseNote(
      `${fileName ? `${fileName}：` : ''}${parsed.candidates.length}件の予定が見つかりました` +
        (parsed.skipped > 0 ? `（読み取れなかった行 ${parsed.skipped}件）` : '') +
        recurringNote +
        '内容を確認してから取り込んでください。',
    );
    if (parsed.candidates.length === 0) {
      setError('予定が1件も読み取れませんでした。ファイルの形式を確認してください。');
    }
  };

  const [shareText, setShareText] = useState('');
  const [shareResult, setShareResult] = useState('');
  const [shareError, setShareError] = useState('');

  const doShareImport = () => {
    setShareError('');
    setShareResult('');
    const code = shareText.trim();
    if (!code.startsWith('EISHIN1.')) {
      setShareError('EISHIN1. で始まる共有コードを貼り付けてください');
      return;
    }
    let summary = '時間割データを取り込みます。クラス・科目などは上書きされます。';
    try {
      const p = parseShareCode(code);
      const days = p.subjects ? Object.keys(p.subjects).length : 0;
      summary = `${p.profile.className || 'クラス未設定'}の時間割です。科目${days}曜日分・ゼミ${p.zemi.length}件・時間割変更${p.exceptions.length}件を取り込みます。クラス・コース・授業曜日と科目は上書きされます。`;
    } catch (e) {
      setShareError(e instanceof Error ? e.message : '共有コードを読み取れませんでした');
      return;
    }
    confirmAction(
      '共有コードを取り込みますか？',
      summary,
      () => {
        void (async () => {
          try {
            const r = await importShareCode(code);
            await recordImport({
              source: 'share-code',
              added: r.zemiAdded + r.exceptionsApplied + r.subjectsDays,
              skipped: 0,
              note: '共有コードから取り込み',
            });
            setRecords(await loadImportHistory());
            setShareResult(`取り込みました（科目${r.subjectsDays}曜日分・ゼミ${r.zemiAdded}件・時間割変更${r.exceptionsApplied}件）`);
            setShareText('');
          } catch {
            setShareError('取り込みに失敗しました');
          }
        })();
      },
      '取り込む',
    );
  };

  const [backupText, setBackupText] = useState('');
  const [backupResult, setBackupResult] = useState('');
  const [backupError, setBackupError] = useState('');

  const doRestoreExec = async () => {
    setBackupError('');
    setBackupResult('');
    try {
      const r = await restoreBackupCode(backupText);
      await recordImport({ source: 'backup', added: r.restoredKeys, skipped: 0, note: 'バックアップから復元' });
      setRecords(await loadImportHistory());
      setBackupResult(`復元しました（${r.restoredKeys}種類のデータ）。他のタブは、開いたときに自動で反映されます。`);
      setBackupText('');
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : '復元に失敗しました');
    }
  };

  const doRestore = () => {
    setBackupError('');
    if (!isBackupCode(backupText)) {
      setBackupError('EISHIN-BACKUP1. で始まるバックアップコードを貼り付けてください');
      return;
    }
    confirmAction(
      'バックアップから復元しますか？',
      '現在のデータはバックアップの内容で上書きされます。',
      () => {
        void doRestoreExec();
      },
      '復元する',
    );
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
          ICS（カレンダー）ファイルと、CSVファイル（日付,タイトル,時間,場所の順）に対応しています。取り込んだ予定は「個人の予定」として保存されます。
        </Text>
        <Text style={styles.note}>
          CSVの例（1行に1件。見出し行は自動で読み飛ばされます。時間と場所は空でも構いません）{'\n'}
          2026-11-10, 図書館で勉強, 14:00-16:00, 図書館{'\n'}
          2026-11-12, 買い物
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
          onPress={() => {
            if (!pasteText.trim()) {
              setError('内容を貼り付けてから「解析する」を押してください');
              return;
            }
            analyze(pasteText);
          }}
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
        <Text style={styles.cardTitle}>時間割の共有コード</Text>
        <Text style={styles.note}>
          友だちから受け取った共有コード（EISHIN1. で始まる文字列）を貼り付けると、その人の時間割を取り込めます。クラス・科目などは上書きされます。
        </Text>
        <TextInput
          style={[styles.input, styles.pasteInput]}
          value={shareText}
          onChangeText={setShareText}
          placeholder="EISHIN1. で始まるコードを貼り付け"
          placeholderTextColor={Colors.subText}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        {shareError ? <Text style={styles.error}>{shareError}</Text> : null}
        {shareResult ? <Text style={styles.success}>{shareResult}</Text> : null}
        <Pressable onPress={doShareImport} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>共有コードを取り込む</Text>
        </Pressable>
      </View>

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
    fontSize: FontSize.body,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  pasteInput: { minHeight: 96, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: Colors.dark, borderRadius: Radius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { color: Colors.subText, fontSize: FontSize.body },
  error: { color: Colors.danger, fontSize: FontSize.small, lineHeight: 20 },
  success: { color: Colors.success, fontSize: FontSize.body, lineHeight: 22 },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});
