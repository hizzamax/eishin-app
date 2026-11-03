import { DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import Onboarding from '@/components/Onboarding';
import { setupNotificationHandler, syncNotifications } from '@/lib/notifications';
import { needsOnboarding } from '@/lib/onboarding';

/** 画面描画で例外が起きたときの受け皿（スタックは開発時のみ表示）。 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView style={ebStyles.root} contentContainerStyle={ebStyles.content}>
      <Text style={ebStyles.title}>画面を表示できませんでした</Text>
      <Text style={ebStyles.message}>{error.message}</Text>
      {__DEV__ ? <Text style={ebStyles.stack}>{error.stack ?? ''}</Text> : null}
      <Pressable onPress={retry} style={ebStyles.button}>
        <Text style={ebStyles.buttonText}>もう一度試す</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  webFrame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
});

const ebStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  message: { fontSize: FontSize.body, color: Colors.danger },
  stack: { fontSize: FontSize.caption, color: Colors.subText },
  button: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
});

export const unstable_settings = {
  // 初期表示はタブ側に固定する
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // ローカル通知：ハンドラ設定と、保存済みデータに合わせた予約の組み直し（起動時）
  useEffect(() => {
    setupNotificationHandler();
    syncNotifications({}).catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
    // Web版のページ言語を日本語にする（読み上げ・フォント選択のため）
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = 'ja';
    }
  }, []);

  // 初回起動時は案内画面を出す（既存ユーザーは needsOnboarding 側で通過する）
  const [gate, setGate] = useState<'loading' | 'onboarding' | 'app'>('loading');
  useEffect(() => {
    needsOnboarding()
      .then((needed) => setGate(needed ? 'onboarding' : 'app'))
      .catch(() => setGate('app'));
  }, []);

  if (gate === 'loading') return null;
  if (gate === 'onboarding') {
    return (
      <ThemeProvider value={DefaultTheme}>
        <Onboarding onDone={() => setGate('app')} />
      </ThemeProvider>
    );
  }
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    // アプリ本体は白基調トークン固定のため、ナビゲーションもライトテーマに固定する
    // （ダークモード対応時にここを切り替える）
    <ThemeProvider value={DefaultTheme}>
      {/* Web（PC）では横に伸びすぎないよう、スマホ幅に寄せて中央に置く */}
      <View style={styles.webFrame}>
        <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="assignments" options={{ title: '課題' }} />
        <Stack.Screen name="announcements" options={{ title: 'お知らせ' }} />
          <Stack.Screen name="import" options={{ title: 'データの取り込み' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
