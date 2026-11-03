import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/Theme';
import {
  addCommunityPost,
  deleteLocalPost,
  formatPostDate,
  loadCommunityPosts,
  POST_KIND_LABEL,
  type CommunityPost,
  type PostKind,
} from '@/lib/community';
import { recordImport } from '@/lib/importHistory';
import { useProfile } from '@/lib/profile';
import { buildShareCode, importShareCode } from '@/lib/share';

const KIND_ORDER: PostKind[] = ['timetable', 'schedule', 'note'];

export default function CommunityScreen() {
  const profile = useProfile();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [mode, setMode] = useState<'remote' | 'local'>('local');
  const [feedError, setFeedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<PostKind>('note');
  const [attach, setAttach] = useState(true);
  const [formError, setFormError] = useState('');
  const [posting, setPosting] = useState(false);

  const [importedIds, setImportedIds] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const feed = await loadCommunityPosts();
    setPosts(feed.posts);
    setMode(feed.mode);
    setFeedError(feed.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onPost = async () => {
    if (!title.trim()) {
      setFormError('タイトルを入力してください');
      return;
    }
    setPosting(true);
    setFormError('');
    try {
      const payloadCode = kind === 'timetable' && attach ? await buildShareCode() : null;
      const { post } = await addCommunityPost({
        author: profile?.name?.trim() ? profile.name.trim() : '匿名',
        className: profile?.className ?? '',
        title: title.trim(),
        body: body.trim(),
        kind,
        payloadCode,
      });
      setPosts((prev) => [post, ...prev]);
      setTitle('');
      setBody('');
    } catch {
      setFormError('投稿できませんでした。通信状態を確認してください。');
    } finally {
      setPosting(false);
    }
  };

  const onImport = async (post: CommunityPost) => {
    if (!post.payloadCode) return;
    try {
      const r = await importShareCode(post.payloadCode);
      await recordImport({ source: 'community', added: r.zemiAdded + r.exceptionsApplied, skipped: 0, note: post.title });
      setImportedIds((prev) => ({
        ...prev,
        [post.id]: `取り込みました（ゼミ${r.zemiAdded}件・時間割変更${r.exceptionsApplied}件）`,
      }));
    } catch {
      setImportedIds((prev) => ({ ...prev, [post.id]: '取り込みに失敗しました' }));
    }
  };

  const onDelete = async (post: CommunityPost) => {
    await deleteLocalPost(post.id);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {mode === 'local' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            いまは「この端末の中だけ」の表示です。投稿はまだ全員には見えません。全員が見られる公開掲示板にするには、サーバー（Supabase）の準備が必要です。準備が完了すると自動で公開表示に切り替わります。
          </Text>
        </View>
      )}
      {mode === 'remote' && (
        <View style={styles.bannerOk}>
          <Text style={styles.bannerOkText}>公開掲示板に接続中：投稿は全員に表示されます。</Text>
        </View>
      )}
      {feedError ? <Text style={styles.error}>{feedError}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>投稿する</Text>
        <Text style={styles.label}>種類</Text>
        <View style={styles.chipRow}>
          {KIND_ORDER.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[styles.chip, kind === k && styles.chipActive]}>
              <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>{POST_KIND_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>タイトル *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="例：3-Aの時間割を共有します" placeholderTextColor={Colors.subText} />
        <Text style={styles.label}>本文</Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          value={body}
          onChangeText={setBody}
          placeholder="ひとこと添えると分かりやすいです"
          placeholderTextColor={Colors.subText}
          multiline
        />
        {kind === 'timetable' && (
          <Pressable onPress={() => setAttach(!attach)} style={styles.rowBetween}>
            <Text style={styles.bodyText}>今の時間割を添付する（取り込み可能にする）</Text>
            <Text style={[styles.chipText, attach && styles.chipTextActive]}>{attach ? 'ON' : 'OFF'}</Text>
          </Pressable>
        )}
        <Text style={styles.note}>
          投稿者名は設定の名前（未設定なら「匿名」）とクラスが表示されます。個人情報や、他の人の予定を勝手に投稿しないでください。
        </Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Pressable onPress={onPost} disabled={posting} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{posting ? '投稿中…' : mode === 'remote' ? 'みんなに投稿する' : '投稿する（端末内）'}</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>みんなの投稿</Text>
      {loading && <Text style={styles.note}>読み込み中…</Text>}
      {!loading && posts.length === 0 && <Text style={styles.note}>投稿はまだありません。</Text>}
      {posts.map((post) => (
        <View key={post.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.meta}>
              {post.author}
              {post.className ? ` ・ ${post.className}` : ''} ・ {formatPostDate(post.createdAt)}
            </Text>
            <View style={styles.kindChip}>
              <Text style={styles.kindText}>{POST_KIND_LABEL[post.kind]}</Text>
            </View>
          </View>
          <Text style={styles.postTitle}>{post.title}</Text>
          {post.body ? <Text style={styles.postBody}>{post.body}</Text> : null}
          <Text style={styles.sourceNote}>
            {post.source === 'sample'
              ? 'サンプル投稿（表示例）'
              : post.source === 'local'
                ? '自分の投稿（この端末内のみ）'
                : 'みんなの投稿'}
          </Text>
          {post.payloadCode && (
            <Pressable onPress={() => onImport(post)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>この時間割を取り込む</Text>
            </Pressable>
          )}
          {importedIds[post.id] ? <Text style={styles.success}>{importedIds[post.id]}</Text> : null}
          {post.source === 'local' && (
            <Pressable onPress={() => onDelete(post)}>
              <Text style={styles.deleteText}>この投稿を削除</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  banner: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  bannerText: { fontSize: FontSize.small, color: Colors.text, lineHeight: 20 },
  bannerOk: { backgroundColor: '#EAF6F0', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.success },
  bannerOkText: { fontSize: FontSize.small, color: Colors.text, lineHeight: 20 },
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
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
  label: { fontSize: FontSize.small, color: Colors.subText, marginTop: Spacing.xs },
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
  bodyInput: { minHeight: 64, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  chipText: { fontSize: FontSize.body, color: Colors.subText, fontWeight: '600' },
  chipTextActive: { color: Colors.accent },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bodyText: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  primaryButton: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  primaryButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: '600' },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  error: { color: Colors.danger, fontSize: FontSize.small, lineHeight: 20 },
  success: { color: Colors.success, fontSize: FontSize.small, lineHeight: 20 },
  meta: { fontSize: FontSize.small, color: Colors.subText, flex: 1 },
  kindChip: { backgroundColor: Colors.accentSoft, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  kindText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: '600' },
  postTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text },
  postBody: { fontSize: FontSize.small, color: Colors.text, lineHeight: 20 },
  sourceNote: { fontSize: FontSize.caption, color: Colors.subText },
  deleteText: { color: Colors.danger, fontSize: FontSize.small },
});
