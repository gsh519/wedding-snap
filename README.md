# WeddingSnap - 結婚式向け写真共有サービス

URLやQRコードを共有するだけで、ゲストから写真・動画を簡単に集められるサービス

## 📋 技術スタック

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Workers + itty-router + TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (本番) / MinIO (ローカル)
- **Auth**: Clerk (予定)

## 🏗️ プロジェクト構成

```
wedding-snap/
├── docker-compose.yml          # Docker設定（frontend + MinIO）
├── README.md
├── CLAUDE.md                   # プロジェクト仕様
├── frontend/                   # Next.jsフロントエンド（Docker）
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── event/[id]/page.tsx
│   └── public/
└── backend/                    # Cloudflare Workers（ホストで実行）
    ├── package.json
    ├── wrangler.toml
    ├── tsconfig.json
    └── src/
        └── index.ts
```

## 🚀 セットアップ手順

### 前提条件

- Node.js 20.x 以上
- npm
- Docker & Docker Compose

### 1. 環境変数の設定

```bash
# Frontend
cd frontend
cp .env.example .env

# Backend
cd backend
cp .dev.vars.example .dev.vars
```

### 2. Dockerサービスの起動（Frontend + MinIO）

```bash
# プロジェクトルートで実行
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 3. Backend（Cloudflare Workers）の起動

**別のターミナルで実行:**

```bash
cd backend

# 依存関係インストール
npm install

# D1データベース初期化（スキーマ作成後）
# npm run db:migrate

# 開発サーバー起動
npm run dev
```

## 🌐 アクセスURL

| サービス | URL | 説明 |
|---------|-----|------|
| Frontend | http://localhost:3000 | Next.jsフロントエンド |
| Backend | http://localhost:8787 | Cloudflare Workers API |
| MinIO Console | http://localhost:9001 | MinIO管理画面（ID/PW: minioadmin） |
| MinIO API | http://localhost:9000 | MinIO S3互換API |

## 📝 開発コマンド

### Frontend（Docker内）

```bash
# ログ確認
docker-compose logs -f frontend

# コンテナ再起動
docker-compose restart frontend

# コンテナに入る
docker exec -it weddingsnap-frontend sh
```

### Backend（ホスト）

```bash
cd backend

# 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# デプロイ（本番）
npm run deploy
```

### Docker

```bash
# すべて起動
docker-compose up -d

# すべて停止
docker-compose down

# すべて削除（データも）
docker-compose down -v

# ビルドし直して起動
docker-compose up -d --build
```

## 🗄️ データベース操作

```bash
cd backend

# DB Studio 起動
npm run db:studio

lsof -i :4983

# ローカルD1でクエリ実行
npx wrangler d1 execute wedding-snap-db --local --command="SELECT * FROM events"

# 本番D1でクエリ実行
npx wrangler d1 execute wedding-snap-db --remote --command="SELECT * FROM events"
```

## 🐛 トラブルシューティング

### Frontendが起動しない

```bash
# コンテナを再ビルド
docker-compose down
docker-compose up -d --build

# node_modulesをクリア
docker-compose down
rm -rf frontend/node_modules frontend/.next
docker-compose up -d --build
```

### Backendが起動しない

```bash
cd backend

# node_modulesを再インストール
rm -rf node_modules
npm install

# .wranglerディレクトリをクリア
rm -rf .wrangler
npm run dev
```

### MinIOにアクセスできない

```bash
# コンテナが起動しているか確認
docker-compose ps

# MinIOコンテナのログ確認
docker-compose logs r2

# MinIOコンテナを再起動
docker-compose restart r2
```

## 📦 本番デプロイ

### Cloudflare設定

1. Cloudflare Dashboardでアカウント作成
2. D1データベース作成
3. R2バケット作成
4. wrangler.tomlのdatabase_idとbucket_nameを更新

### デプロイ実行

```bash
cd backend

# ログイン
npx wrangler login

# D1マイグレーション
npm run db:migrate:remote

# デプロイ
npm run deploy
```

## 🔒 セキュリティ

- `.env`と`.dev.vars`は絶対にコミットしない
- 本番環境では環境変数を使用
- CORS設定は本番環境で適切に制限

## 📄 ライセンス

Private Project
