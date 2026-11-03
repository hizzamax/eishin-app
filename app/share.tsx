import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import { buildShareCode, importShareCode, QR_MAX_LENGTH } from '@/lib/share';

export default function ShareScreen() {
  const [code, setCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [importText, setImportText] = useState('');
  const [result, setResult] = useState('');
  const [importError, setImportError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    let alive = true;
    buildShareCode()
      .then((c) => {
        if (alive) setCode(c);
      })
      .catch(() => {
        if (alive) setLoadError('共有コードを作れませんでした');
      });
    return () => {
      alive = false;
    };
  }, []);

  const doImport = async (raw: string) => {
    setImportError('');
    setResult('');
    try {
      const r = await importShareCode(raw);
      setResult(
        `取り込みました：${r.className}／${r.course}、ゼミ ${r.zemiAdded} 件を追加、時間割変更 ${r.exceptionsApplied} 件を反映しました。時間割タブで確認してください。`,
      );
      setScanning(false);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '取り込みに失敗しました');
    }
  };

  const onShareCode = async () => {
    if (!code) return;
    try {
      await Share.share({ message: code });
    } catch {
      // キャンセル時などは何もしない
    }
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setImportError('カメラの許可が必要です');
        return;
      }
    }
    setImportError('');
    setScanning(true);
  };

  const qrTooLong = code.length > QR_MAX_LENGTH;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>自分の時間割を共有する</Text>
        <Text style={styles.note}>
          共有されるのは、クラス・コース・授業曜日・ゼミ・時間割変更だけです。名前・個人的な予定・課題は含まれません。
        </Text>
        {loadError ? (
          <Text style={styles.error}>{loadError}</Text>
        ) : code === '' ? (
          <Text style={styles.note}>読み込み中…</Text>
        ) : qrTooLong ? (
          <Text style={styles.note}>
            登録データが多いため、QRコードには収まりません。下のコードを共有してください。
          </Text>
        ) : (
          <View style={styles.qrWrap}>
            <QRCode value={code} size={220} color={Colors.text} backgroundColor="#FFFFFF" />
            <Text style={styles.note}>相手のアプリの「QRコードを読み取る」で読み取ってもらえます</Text>
          </View>
        )}
        {code !== '' && (
          <>
            <Text style={styles.codeBox} selectable>
              {code}
            </Text>
            <Pressable onPress={onShareCode} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>コードを共有する</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>共有された時間割を取り込む</Text>
        <Text style={styles.note}>
          取り込むと、クラス・コース・授業曜日が相手の設定に切り替わり、ゼミと時間割変更が追加・反映されます（自分の名前は変わりません）。
        </Text>

        {scanning ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                setScanning(false);
                doImport(data);
              }}
            />
            <Pressable onPress={() => setScanning(false)} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>読み取りをやめる</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={startScan} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>QRコードを読み取る</Text>
          </Pressable>
        )}

        <Text style={styles.label}>コードを貼り付けて取り込む</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={importText}
          onChangeText={setImportText}
          placeholder="EISHIN1. で始まるコードを貼り付け"
          placeholderTextColor={Colors.subText}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Pressable
          onPress={() => importText.trim() && doImport(importText)}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>取り込む</Text>
        </Pressable>
        {importError ? <Text style={styles.error}>{importError}</Text> : null}
        {result ? <Text style={styles.success}>{result}</Text> : null}
      </View>

      <Text style={styles.footer}>
        共有は端末同士で直接行われ、サーバーには送信されません。受け取ったコードの内容は、取り込む前に送った人に確認してください。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.lg },
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
  qrWrap: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  codeBox: {
    fontSize: FontSize.caption,
    color: Colors.subText,
    backgroundColor: Colors.subBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    lineHeight: 18,
  },
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
  codeInput: { minHeight: 72, textAlignVertical: 'top', fontSize: FontSize.small },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '600' },
  ghostButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  ghostButtonText: { color: Colors.subText, fontSize: FontSize.body },
  cameraWrap: { gap: Spacing.sm },
  camera: { height: 280, borderRadius: Radius.md, overflow: 'hidden' },
  error: { color: Colors.danger, fontSize: FontSize.small, lineHeight: 20 },
  success: { color: Colors.success, fontSize: FontSize.small, lineHeight: 20 },
  footer: { fontSize: FontSize.caption, color: Colors.subText, textAlign: 'center', lineHeight: 18 },
});
