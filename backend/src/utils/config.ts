/**
 * アプリケーション設定定数
 */

// ストレージ制限（バイト単位）
export const STORAGE_LIMITS = {
  FREE_PLAN: 2 * 1024 * 1024 * 1024, // 2GB
  PAID_PLAN: 10 * 1024 * 1024 * 1024, // 10GB
} as const

// アルバム有効期限（日数）
export const ALBUM_EXPIRATION_DAYS = 30

// プランタイプ
export const PLAN_TYPES = {
  FREE: 0,
  PAID: 1,
} as const
