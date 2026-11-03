import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
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
import { confirmAction } from '@/lib/confirm';
import { recordImport } from '@/lib/importHistory';
import { useProfile } from '@/lib/profile';
import { buildShareCode, importShareCode, parseShareCode } from '@/lib/share';

const KIND_ORDER: PostKind[] = ['timetable', 'schedule', 'note'];
type Filter = PostKind | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'timetable', label: POST_KIND_LABEL.timetable },
  { key: 'schedule', label: POST_KIND_LABEL.schedule },
  { key: 'note', label: POST_KIND_LABEL.note },
];

const KIND_CHIP_STYLE: Record<PostKind, { bg: string; fg: string }> = {
  timetable: { bg: Colors.blueSoft, fg: Colors.blue },
  schedule: { bg: Colors.successSoft, fg: Colors.success },
  note: { bg: Colors.accentSoft, fg: Colors.accent },
};

export default function CommunityScreen() {
  const profile = useProfile();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [mode, setMode] = useState<'remote' | 'local'>('local');
  const [feedError, setFeedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<PostKind>('note');
  const [attach, setAttach] = useState(true);
  const [formError, setFormError] = useState('');
  const [posting, setPosting] = useState(false);

  const [importedIds, setImportedIds] = useState<Record<string, string>>({});
  const [importedOkIds, setImportedOkIds] = useState<Record<string, boolean>>({});

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

  const visiblePosts = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.kind === filter)),
    [posts, filter],
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
      setFilter('all');
      setFormOpen(false);
    } catch {
      setFormError('投稿できませんでした。通信状態を確認してください。');
    } finally {
      setPosting(false);
    }
  };

  const doImport = async (post: CommunityPost) => {
    if (!post.payloadCode) return;
    try {
      const r = await importShareCode(post.payloadCode);
      await recordImport({
        source: 'community',
        added: r.zemiAdded + r.exceptionsApplied + r.subjectsDays,
        skipped: 0,
        note: post.title,
      });
      setImportedIds((prev) => ({
        ...prev,
        [post.id]: `取り込みました（科目${r.subjectsDays}曜日分・ゼミ${r.zemiAdded}件・時間割変更${r.exceptionsApplied}件）`,
      }));
      setImportedOkIds((prev) => ({ ...prev, [post.id]: true }));
    } catch {
      setImportedIds((prev) => ({ ...prev, [post.id]: '取り込みに失敗しました' }));
    }
  };

  // 取り込みは自分のデータを上書きするため、内容を確認してから実行する
  const onImport = (post: CommunityPost) => {
    if (!post.payloadCode || importedOkIds[post.id]) return;
    let summary = '時間割データを取り込みます。クラス・科目などは上書きされます。';
    try {
      const p = parseShareCode(post.payloadCode);
      const days = p.subjects ? Object.keys(p.subjects).length : 0;
      summary = `${p.profile.className || 'クラス未設定'}の時間割です。科目${days}曜日分・ゼミ${p.zemi.length}件・時間割変更${p.exceptions.length}件を取り込みます。クラス・コース・授業曜日と科目は上書きされます。`;
    } catch {
      // 内容を読めない場合は汎用の文言で確認する
    }
    confirmAction('この時間割を取り込みますか？', summary, () => void doImport(post), '取り込む');
  };

  const onDelete = (post: CommunityPost) => {
    confirmAction('投稿を削除しますか？', `「${post.title}」を削除します。`, () => {
      void (async () => {
        await deleteLocalPost(post.id);
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
      })();
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 状態は1行だけの細いバーで知らせる（一覧の邪魔をしない） */}
      {mode === 'local' ? (
        <View style={[styles.statusBar, styles.statusBarLocal]}>
          <SymbolView name={{ ios: 'iphone', android: 'smartphone', web: 'smartphone' }} tintColor={Colors.accent} size={15} />
          <Text style={styles.statusText}>この端末内だけの表示です（公開掲示板は準備中）</Text>
        </View>
      ) : (
        <View style={[styles.statusBar, styles.statusBarRemote]}>
          <SymbolView name={{ ios: 'globe', android: 'public', web: 'public' }} tintColor={Colors.success} size={15} />
          <Text style={styles.statusText}>公開掲示板に接続中（投稿は全員に表示されます）</Text>
        </View>
      )}
      {feedError ? <Text style={styles.error}>{feedError}</Text> : null}

      {/* 見出し＋投稿ボタン */}
      <View style={styles.headerRow}>
        <Text style={styles.heading}>
          みんなの投稿{!loading && posts.length > 0 ? (
            <Text style={styles.headingCount}> {filter === 'all' ? `${posts.length}件` : `${visiblePosts.length}件 / 全${posts.length}件`}</Text>
          ) : null}
        </Text>
        <Pressable
          onPress={() => setFormOpen((v) => !v)}
          style={[styles.composeButton, formOpen && styles.composeButtonOpen]}
        >
          <SymbolView
            name={{ ios: formOpen ? 'xmark' : 'plus', android: formOpen ? 'close' : 'add', web: formOpen ? 'close' : 'add' }}
            tintColor={formOpen ? Colors.text : Colors.white}
            size={16}
          />
          <Text style={[styles.composeButtonText, formOpen && styles.composeButtonTextOpen]}>
            {formOpen ? '閉じる' : '投稿する'}
          </Text>
        </Pressable>
      </View>

      {/* 種類フィルター */}
      <View style={styles.chipRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 投稿フォーム（開いたときだけ表示） */}
      {formOpen && (
        <View style={styles.card}>
          <Text style={styles.label}>種類</Text>
          <View style={styles.chipRow}>
            {KIND_ORDER.map((k) => {
              const active = kind === k;
              return (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.kindSelectChip, active && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{POST_KIND_LABEL[k]}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>タイトル *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例：3-Aの時間割を共有します"
            placeholderTextColor={Colors.subText}
          />
          <Text style={styles.label}>本文</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder="ひとこと添えると分かりやすいです"
            placeholderTextColor={Colors.subText}
            multiline
          />
          <Pressable
            onPress={() => {
              if (kind === 'timetable') setAttach(!attach);
            }}
            style={styles.rowBetween}>
            <Text style={styles.bodyText}>今の時間割を添付する（取り込み可能にする）</Text>
            {kind === 'timetable' ? (
              <View style={[styles.togglePill, attach && styles.togglePillOn]}>
                <Text style={[styles.toggleText, attach && styles.toggleTextOn]}>{attach ? 'ON' : 'OFF'}</Text>
              </View>
            ) : (
              <Text style={styles.note}>種類で「時間割」を選ぶと添付できます</Text>
            )}
          </Pressable>
          <Text style={styles.note}>投稿者名は設定の名前（未設定なら「匿名」）とクラスが表示されます。個人情報は書かないでください。</Text>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable onPress={onPost} disabled={posting} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{posting ? '投稿中…' : mode === 'remote' ? 'みんなに投稿する' : '投稿する（端末内）'}</Text>
          </Pressable>
        </View>
      )}

      {/* 投稿一覧 */}
      {loading && <Text style={styles.note}>読み込み中…</Text>}
      {!loading && posts.length === 0 && (
        <View style={styles.emptyCard}>
          <SymbolView name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }} tintColor={Colors.accentSub} size={40} />
          <Text style={styles.emptyTitle}>まだ投稿がありません</Text>
          <Text style={styles.note}>右上の「投稿する」から、最初の投稿をしてみよう。</Text>
        </View>
      )}
      {!loading && posts.length > 0 && visiblePosts.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>この種類の投稿はまだありません</Text>
        </View>
      )}
      {visiblePosts.map((post) => {
        const chip = KIND_CHIP_STYLE[post.kind];
        return (
          <View key={post.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <View style={[styles.kindChip, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.kindText, { color: chip.fg }]}>{POST_KIND_LABEL[post.kind]}</Text>
                </View>
                {post.source === 'sample' && (
                  <View style={styles.sourceChip}>
                    <Text style={styles.sourceChipText}>サンプル</Text>
                  </View>
                )}
                {post.source === 'local' && (
                  <View style={styles.sourceChip}>
                    <Text style={styles.sourceChipText}>自分の投稿</Text>
                  </View>
                )}
              </View>
              <Text style={styles.dateText}>{formatPostDate(post.createdAt)}</Text>
            </View>
            <Text style={styles.postTitle}>{post.title}</Text>
            {post.body ? <Text style={styles.postBody}>{post.body}</Text> : null}
            {post.payloadCode && (
              <Pressable
                onPress={() => onImport(post)}
                disabled={!!importedOkIds[post.id]}
                style={[styles.importButton, importedOkIds[post.id] && styles.importButtonDone]}>
                <Text style={styles.primaryButtonText}>{importedOkIds[post.id] ? '取り込み済み' : 'この時間割を取り込む'}</Text>
              </Pressable>
            )}
            {importedIds[post.id] ? <Text style={styles.success}>{importedIds[post.id]}</Text> : null}
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>
                {post.author}
                {post.className ? ` ・ ${post.className}` : ''}
              </Text>
              {post.source === 'local' && (
                <Pressable onPress={() => onDelete(post)} hitSlop={8}>
                  <Text style={styles.deleteText}>削除</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.subBackground },
  content: { padding: Spacing.lg, gap: Spacing.md },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusBarLocal: { backgroundColor: Colors.accentSoft },
  statusBarRemote: { backgroundColor: Colors.successSoft },
  statusText: { fontSize: FontSize.caption, color: Colors.text, flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: FontSize.lead, fontWeight: '700', color: Colors.text },
  headingCount: { fontSize: FontSize.small, fontWeight: '400', color: Colors.subText },
  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  composeButtonOpen: { backgroundColor: Colors.border },
  composeButtonText: { color: Colors.white, fontSize: FontSize.small, fontWeight: '600' },
  composeButtonTextOpen: { color: Colors.text },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterChipText: { fontSize: FontSize.small, color: Colors.subText, fontWeight: '600' },
  filterChipTextActive: { color: Colors.white },
  kindSelectChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow,
  },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bodyText: { fontSize: FontSize.body, color: Colors.text, flex: 1 },
  togglePill: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  togglePillOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  toggleText: { fontSize: FontSize.small, fontWeight: '700', color: Colors.subText },
  toggleTextOn: { color: Colors.white },
  primaryButton: { backgroundColor: Colors.dark, borderRadius: Radius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  importButton: { backgroundColor: Colors.dark, borderRadius: Radius.pill, paddingVertical: Spacing.sm + 2, alignItems: 'center', marginTop: Spacing.xs },
  importButtonDone: { opacity: 0.55 },
  primaryButtonText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },
  note: { fontSize: FontSize.small, color: Colors.subText, lineHeight: 20 },
  error: { color: Colors.danger, fontSize: FontSize.small, lineHeight: 20 },
  success: { color: Colors.success, fontSize: FontSize.small, lineHeight: 20 },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
    ...Shadow,
  },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text },
  kindChip: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  kindText: { fontSize: FontSize.caption, fontWeight: '700' },
  sourceChip: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  sourceChipText: { fontSize: FontSize.caption, color: Colors.subText },
  dateText: { fontSize: FontSize.caption, color: Colors.subText },
  postTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text },
  postBody: { fontSize: FontSize.small, color: Colors.text, lineHeight: 20 },
  meta: { fontSize: FontSize.small, color: Colors.subText, flex: 1 },
  deleteText: { color: Colors.danger, fontSize: FontSize.small },
});
