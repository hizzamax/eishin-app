import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 初回起動時の案内（オンボーディング）が必要かどうか。
 * - 案内済みフラグがあれば不要
 * - プロフィールが既に保存されている既存ユーザーには出さない（フラグを立てて通過）
 */
const FLAG_KEY = 'eishin.onboarded.v1';
const PROFILE_KEY = 'eishin.profile.v1';

export async function needsOnboarding(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(FLAG_KEY);
    if (flag) return false;
    const profile = await AsyncStorage.getItem(PROFILE_KEY);
    if (profile) {
      await AsyncStorage.setItem(FLAG_KEY, '1');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(FLAG_KEY, '1');
  } catch {
    // 保存できなくてもアプリは使える（次回また案内が出るだけ）
  }
}
