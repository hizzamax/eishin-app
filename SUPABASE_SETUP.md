# コミュニティ公開のための Supabase セットアップ手順

コミュニティ（みんなの掲示板）を「全員が見られる」状態にするには、無料の Supabase プロジェクトが1つ必要です。所要時間は約5〜10分です。費用はかかりません（無料枠）。

## 手順

1. https://supabase.com を開き、「Start your project」からアカウントを作る（GitHubアカウントでも可）。
2. 「New project」でプロジェクトを作成する。
   - Name：eishin-app など任意
   - Database password：自動生成して控えておく（アプリでは使いません）
   - Region：Northeast Asia (Tokyo) が近いです
3. プロジェクトが用意できたら、左メニューの「SQL Editor」を開く。
4. このフォルダの `supabase/schema.sql` の内容を貼り付けて「Run」を押す（テーブルと公開ポリシーが作られます）。
5. 左メニューの「Project Settings」→「API」を開き、次の2つを控える。
   - Project URL（例：https://xxxxx.supabase.co）
   - anon public キー（`eyJ...` で始まる長い文字列。これは公開前提のキーです）
6. 控えた2つを舞香に伝える。アプリの `app.json` の `extra.supabaseUrl` / `extra.supabaseAnonKey` に入れて再ビルドすると、コミュニティが公開掲示板に切り替わります。

## 注意

- anon キーは「公開してもよいキー」です（読み書きの可否はデータベース側のポリシーで制御しています）。一方、`service_role` キーと Database password は秘密情報なので、共有しないでください。
- ログインなしの掲示板のため、荒らし投稿を完全に防ぐ仕組みはありません。不適切な投稿はダッシュボードの「Table Editor」から手動で削除できます。
- 本格運用する場合は、アカウント制への移行と合わせて再設計します（フェーズ5以降）。
