-- 英心アプリ（非公式）コミュニティ用スキーマ
-- Supabase の SQL Editor に貼り付けて実行する（SUPABASE_SETUP.md 参照）。
-- ログインなしで「全員が読める・誰でも投稿できる」掲示板のための最小構成。
-- 注意：ログインなしの投稿は荒らし対策が弱い。公開後は様子を見て、
-- 問題があれば投稿ポリシーを締めるか、アカウント制に移行すること。

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(author_name) <= 50),
  class_name text check (char_length(class_name) <= 20),
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  kind text not null default 'note' check (kind in ('timetable', 'schedule', 'note')),
  payload_code text check (char_length(payload_code) <= 8000),
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

-- 全員が読める
drop policy if exists "community_posts_read" on public.community_posts;
create policy "community_posts_read"
  on public.community_posts for select
  to anon, authenticated
  using (true);

-- ログインなしで投稿できる（アプリの anon キー経由）
drop policy if exists "community_posts_insert" on public.community_posts;
create policy "community_posts_insert"
  on public.community_posts for insert
  to anon, authenticated
  with check (true);

-- 更新・削除はポリシーを作らない＝誰もできない（管理はダッシュボードから手動）
