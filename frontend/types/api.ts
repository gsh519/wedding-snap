// ========================================
// バックエンドAPIの型定義
// ========================================

// ジョブステータス（backend/src/db/schema.tsと同期）
export const JobStatus = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3,
} as const

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus]

// プランタイプ（backend/src/db/schema.tsと同期）
export const PlanType = {
  FREE: 0,
  PAID: 1,
} as const

export type PlanTypeType = (typeof PlanType)[keyof typeof PlanType]

// 削除理由（backend/src/db/schema.tsと同期）
export const DeleteReason = {
  EXPIRED_30_DAYS: 1,
  EXPIRED_37_DAYS: 2,
  MANUAL: 3,
} as const

export type DeleteReasonType = (typeof DeleteReason)[keyof typeof DeleteReason]

// ダウンロードジョブ情報
export type DownloadJobInfo = {
  jobId: number
  jobStatus: JobStatusType
  createdAt: string
  completedAt: string | null
  totalFiles: number | null
  zipCount: number | null
  secretToken: string
}
