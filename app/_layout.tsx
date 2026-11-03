import { DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import 'react-native-reanimated';

import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import { setupNotificationHandler, syncNotifications } from '@/lib/notifications';

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
  }, []);

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    // アプリ本体は白基調トークン固定のため、ナビゲーションもライトテーマに固定する
    // （ダークモード対応時にここを切り替える）
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="assignments" options={{ title: '課題' }} />
        <Stack.Screen name="attendance" options={{ title: '登校予定' }} />
        <Stack.Screen name="announcements" options={{ title: 'お知らせ' }} />
        <Stack.Screen name="import" options={{ title: 'データの取り込み' }} />
      </Stack>
    </ThemeProvider>
  );
}
