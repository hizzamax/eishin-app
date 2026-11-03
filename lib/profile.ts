import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_PROFILE, type WeekdayLabel } from '@/data/seed';

export type Profile = {
  name: string;
  className: string;
  course: string;
  classDays: WeekdayLabel[];
};

const KEY = 'eishin.profile.v1';

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      className: parsed.className || DEFAULT_PROFILE.className,
      course: parsed.course || DEFAULT_PROFILE.course,
      classDays: Array.isArray(parsed.classDays) && parsed.classDays.length > 0 ? parsed.classDays : DEFAULT_PROFILE.classDays,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

/** プロフィールを読み込むフック。読み込み中は null。タブを開き直すたびに読み直す。 */
export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  const reload = useCallback(() => {
    loadProfile().then(setProfile);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return profile;
}
