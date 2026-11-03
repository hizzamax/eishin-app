import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { setupNotificationHandler, syncNotifications } from '@/lib/notifications';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

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
