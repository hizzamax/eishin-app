import { Alert, Platform } from 'react-native';

/**
 * 破壊的操作（削除・上書き）の前に確認を挟むための共通ヘルパー。
 * Web では window.confirm、ネイティブでは Alert を使う。
 */
export function confirmAction(title: string, message: string, onConfirm: () => void, confirmLabel = '削除する'): void {
  if (Platform.OS === 'web') {
    const g = globalThis as { confirm?: (msg?: string) => boolean };
    if (typeof g.confirm === 'function') {
      if (g.confirm(`${title}\n${message}`)) onConfirm();
    } else {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'キャンセル', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
