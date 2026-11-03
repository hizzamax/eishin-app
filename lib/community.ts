import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { newId } from '@/lib/assignments';

/**
 * コミュニティ（みんなの掲示板）。
 * 「誰でも見られる投稿」のためにはサーバーが必要。接続先（Supabase）が
 * 設定されていれば全員の投稿を読み書きし、未設定の間は端末内だけの
 * ローカル表示にフォールバックする（画面側でその旨を明示する）。
 *
 * 接続先は app.json の extra.supabaseUrl / extra.supabaseAnonKey。
 * anonキーは公開前提のキー（読み書きはDB側のポリシーで制御する）。
 */

export type PostKind = 'timetable' | 'schedule' | 'note';

export const POST_KIND_LABEL: Record<PostKind, string> = {
  timetable: '時間割',
  schedule: '予定',
  note: 'メモ',
};

export type CommunityPost = {
  id: string;
  author: string;
  className: string;
  title: string;
  body: string;
  kind: PostKind;
  /** 時間割の共有コード（取り込み可能な場合のみ） */
  payloadCode: string | null;
  createdAt: string; // ISO
  source: 'remote' | 'local' | 'sample';
};

const LOCAL_KEY = 'eishin.communityLocal.v1';

/** 表示例であることが分かるよう、作者名を「サンプル」と明記した例示投稿 */
const SAMPLE_POSTS: CommunityPost[] = [
  {
    id: 'sample-2',
    author: 'サンプル',
    className: '3-A',
    title: '投稿の例：時間割を共有するとき',
    body: '「時間割を添付」をオンにして投稿すると、他の人がこの投稿から自分のアプリに時間割を取り込めるようになります。これは表示例の投稿です（サンプルのため取り込みボタンはありません）。',
    kind: 'timetable',
    payloadCode: null,
    createdAt: '2026-11-03T10:00:00+09:00',
    source: 'sample',
  },
  {
    id: 'sample-1',
    author: 'サンプル',
    className: '',
    title: '投稿の例：こんな使い方ができます',
    body: '行事の準備の呼びかけや、勉強会のお知らせなど、みんなに知らせたいことを投稿できます。これは表示例の投稿です。',
    kind: 'note',
    payloadCode: null,
    createdAt: '2026-11-03T09:00:00+09:00',
    source: 'sample',
  },
];

// --- 接続設定 ---

type SupabaseConfig = { url: string; anonKey: string };

export function supabaseConfig(): SupabaseConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };
  return { url: extra.supabaseUrl ?? '', anonKey: extra.supabaseAnonKey ?? '' };
}

export function communityRemoteConfigured(): boolean {
  const { url, anonKey } = supabaseConfig();
  return url.startsWith('https://') && anonKey.length >= 20;
}

// --- ローカル保存 ---

async function loadLocalPosts(): Promise<CommunityPost[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalPosts(posts: CommunityPost[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(posts));
}

// --- リモート（Supabase PostgREST） ---

type RemoteRow = {
  id: string;
  author_name: string;
  class_name: string | null;
  title: string;
  body: string;
  kind: string;
  payload_code: string | null;
  created_at: string;
};

function rowToPost(row: RemoteRow): CommunityPost {
  return {
    id: row.id,
    author: row.author_name,
    className: row.class_name ?? '',
    title: row.title,
    body: row.body,
    kind: (['timetable', 'schedule', 'note'].includes(row.kind) ? row.kind : 'note') as PostKind,
    payloadCode: row.payload_code,
    createdAt: row.created_at,
    source: 'remote',
  };
}

async function fetchRemotePosts(): Promise<CommunityPost[]> {
  const { url, anonKey } = supabaseConfig();
  const res = await fetch(`${url}/rest/v1/community_posts?select=*&order=created_at.desc&limit=100`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as RemoteRow[];
  return rows.map(rowToPost);
}

async function postToRemote(draft: Omit<CommunityPost, 'id' | 'createdAt' | 'source'>): Promise<CommunityPost> {
  const { url, anonKey } = supabaseConfig();
  const res = await fetch(`${url}/rest/v1/community_posts`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      author_name: draft.author,
      class_name: draft.className || null,
      title: draft.title,
      body: draft.body,
      kind: draft.kind,
      payload_code: draft.payloadCode,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as RemoteRow[];
  return rowToPost(rows[0]);
}

// --- 公開API ---

export type CommunityFeed = {
  posts: CommunityPost[];
  mode: 'remote' | 'local';
  error: string | null;
};

export async function loadCommunityPosts(): Promise<CommunityFeed> {
  if (communityRemoteConfigured()) {
    try {
      const posts = await fetchRemotePosts();
      return { posts, mode: 'remote', error: null };
    } catch {
      const local = await loadLocalPosts();
      return {
        posts: [...local, ...SAMPLE_POSTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        mode: 'local',
        error: 'サーバーに接続できなかったため、この端末内の投稿を表示しています。',
      };
    }
  }
  const local = await loadLocalPosts();
  return {
    posts: [...local, ...SAMPLE_POSTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    mode: 'local',
    error: null,
  };
}

export async function addCommunityPost(
  draft: Omit<CommunityPost, 'id' | 'createdAt' | 'source'>,
): Promise<{ post: CommunityPost; mode: 'remote' | 'local' }> {
  if (communityRemoteConfigured()) {
    const post = await postToRemote(draft);
    return { post, mode: 'remote' };
  }
  const post: CommunityPost = {
    ...draft,
    id: newId(),
    createdAt: new Date().toISOString(),
    source: 'local',
  };
  const local = await loadLocalPosts();
  await saveLocalPosts([post, ...local]);
  return { post, mode: 'local' };
}

export async function deleteLocalPost(id: string): Promise<void> {
  const local = await loadLocalPosts();
  await saveLocalPosts(local.filter((p) => p.id !== id));
}

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}
