import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ========================================
// 1. users テーブル
// ========================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Google認証のUID
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ========================================
// 2. albums テーブル
// ========================================
export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id),
  slug: text('slug').notNull().unique(), // 共有URL用スラッグ
  albumName: text('album_name').notNull(), // 例: "Yuto & Mei"
  eventDate: text('event_date').notNull(), // 結婚式日（予定日 or 実施日）
  planType: integer('plan_type').notNull().default(0), // 0: free, 1: paid
  storageUsed: integer('storage_used').notNull().default(0), // 使用容量（bytes）
  storageLimit: integer('storage_limit').notNull().default(2147483648), // 2GB
  downloadCount: integer('download_count').notNull().default(0), // 一括DL回数
  expireAt: text('expire_at').notNull(), // 30日後の有効期限
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ========================================
// 3. medias テーブル
// ========================================
export const medias = sqliteTable('medias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  albumId: text('album_id').notNull().references(() => albums.id),
  uploadUserName: text('upload_user_name'), // ゲストの入力名
  r2Key: text('r2_key').notNull(), // R2オブジェクトキー
  fileName: text('file_name').notNull(), // 元のファイル名
  mimeType: text('mime_type').notNull(), // MIME type
  fileSize: integer('file_size').notNull(), // bytes
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'), // 論理削除日時
})

// ========================================
// 4. download_jobs テーブル
// ========================================
export const downloadJobs = sqliteTable('download_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  albumId: text('album_id').notNull().references(() => albums.id),
  secretToken: text('secret_token').notNull().unique(), // ダウンロード用秘密トークン（UUID）
  jobStatus: integer('job_status').notNull().default(0), // 0: pending, 1: processing, 2: completed, 3: failed
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  // 一括ダウンロード機能用の追加フィールド
  totalFiles: integer('total_files'), // 総ファイル数
  zipCount: integer('zip_count').default(1), // 分割ZIP数（500枚ごと）
  zipR2Keys: text('zip_r2_keys'), // JSON配列: ["key1", "key2"]
})

// ========================================
// 5. medias_delete_logs テーブル
// ========================================
export const mediasDeleteLogs = sqliteTable('medias_delete_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mediaId: integer('media_id').notNull(),
  albumId: text('album_id').notNull().references(() => albums.id),
  r2Key: text('r2_key').notNull(),
  deleteReason: integer('delete_reason').notNull(), // 1: 30days, 2: 37days, 3: manual
  info: text('info'), // 追加情報（JSON文字列）
  deletedAt: text('deleted_at').notNull(),
})

// ========================================
// 型エクスポート
// ========================================
export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert

export type Album = typeof albums.$inferSelect
export type InsertAlbum = typeof albums.$inferInsert

export type Media = typeof medias.$inferSelect
export type InsertMedia = typeof medias.$inferInsert

export type DownloadJob = typeof downloadJobs.$inferSelect
export type InsertDownloadJob = typeof downloadJobs.$inferInsert

export type MediaDeleteLog = typeof mediasDeleteLogs.$inferSelect
export type InsertMediaDeleteLog = typeof mediasDeleteLogs.$inferInsert

// ========================================
// ENUM定義（TypeScript用）
// ========================================
export const PlanType = {
  FREE: 0,
  PAID: 1,
} as const

export const JobStatus = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3,
} as const

export const DeleteReason = {
  EXPIRED_30_DAYS: 1,
  EXPIRED_37_DAYS: 2,
  MANUAL: 3,
} as const
