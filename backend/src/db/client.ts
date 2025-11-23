import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * Drizzle ORM クライアントを取得
 * @param d1 - Cloudflare D1 Database インスタンス
 * @returns Drizzle ORM クライアント
 */
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

// 型エクスポート
export type DrizzleDb = ReturnType<typeof getDb>
