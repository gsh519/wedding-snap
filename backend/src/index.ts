import { Router, error, json } from 'itty-router'
import { eq } from 'drizzle-orm'
import { getDb } from './db/client'
import { albums, medias } from './db/schema'
import {
  checkStorageLimit,
  checkAlbumExpiration,
  validateMimeType,
  validateFileSize,
} from './utils/validation'

// 型定義
export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  ENVIRONMENT: string
}

// CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Routerの作成
const router = Router()

// CORS Preflight
router.options('*', () => new Response(null, { headers: corsHeaders }))

// Health Check
router.get('/health', () => {
  return json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: corsHeaders })
})

// API Routes

// イベント一覧取得
router.get('/api/events', async (request, env: Env) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, title, event_date, plan_type, storage_used, storage_limit, created_at, expires_at FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC'
    ).all()

    return json({ events: results }, { headers: corsHeaders })
  } catch (e) {
    console.error('Error fetching events:', e)
    return error(500, 'Internal Server Error')
  }
})

// イベント詳細取得
router.get('/api/events/:id', async (request, env: Env) => {
  const { id } = request.params

  try {
    const event = await env.DB.prepare(
      'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first()

    if (!event) {
      return error(404, 'Event not found')
    }

    // メディア一覧も取得
    const { results: media } = await env.DB.prepare(
      'SELECT id, file_name, file_size, file_type, uploaded_at FROM media WHERE event_id = ? AND deleted_at IS NULL ORDER BY uploaded_at DESC'
    ).bind(id).all()

    return json({ event, media }, { headers: corsHeaders })
  } catch (e) {
    console.error('Error fetching event:', e)
    return error(500, 'Internal Server Error')
  }
})

// イベント作成
router.post('/api/events', async (request, env: Env) => {
  try {
    const body = await request.json() as {
      userId: string
      title: string
      eventDate?: string
      planType?: 'free' | 'paid'
    }

    const eventId = crypto.randomUUID()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30日後

    const storageLimit = body.planType === 'paid' ? 10737418240 : 2147483648 // 10GB or 2GB

    await env.DB.prepare(
      `INSERT INTO events (id, user_id, title, event_date, plan_type, storage_limit, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      eventId,
      body.userId,
      body.title,
      body.eventDate || null,
      body.planType || 'free',
      storageLimit,
      now,
      expiresAt
    ).run()

    return json({ eventId, message: 'Event created successfully' }, { headers: corsHeaders, status: 201 })
  } catch (e) {
    console.error('Error creating event:', e)
    return error(500, 'Internal Server Error')
  }
})

// メディアアップロード（slug経由）
router.post('/api/albums/:slug/media/upload', async (request, env: Env) => {
  const { slug } = request.params

  try {
    const db = getDb(env.DB)

    // slugからアルバム取得
    const albumResult = await db
      .select()
      .from(albums)
      .where(eq(albums.slug, slug))
      .limit(1)

    const album = albumResult[0]
    if (!album) {
      return json(
        { error: 'アルバムが見つかりません' },
        { status: 404, headers: corsHeaders }
      )
    }

    // 有効期限チェック
    const expirationCheck = checkAlbumExpiration(album)
    if (!expirationCheck.isValid) {
      return json(
        { error: expirationCheck.message },
        { status: 400, headers: corsHeaders }
      )
    }

    // multipart/form-dataをパース
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploaderName = formData.get('uploaderName') as string | null
    const fileName = formData.get('fileName') as string | null
    const mimeType = formData.get('mimeType') as string | null
    const fileSize = parseInt(formData.get('fileSize') as string || '0')

    if (!file || !fileName || !mimeType) {
      return json(
        { error: '必須フィールドが不足しています' },
        { status: 400, headers: corsHeaders }
      )
    }

    // MIME typeバリデーション
    const mimeCheck = validateMimeType(mimeType)
    if (!mimeCheck.isValid) {
      return json({ error: mimeCheck.message }, { status: 400, headers: corsHeaders })
    }

    // ファイルサイズバリデーション
    const sizeCheck = validateFileSize(mimeType, fileSize)
    if (!sizeCheck.isValid) {
      return json({ error: sizeCheck.message }, { status: 400, headers: corsHeaders })
    }

    // 容量制限チェック
    const storageCheck = checkStorageLimit(album, fileSize)
    if (!storageCheck.canUpload) {
      return json({ error: storageCheck.message }, { status: 400, headers: corsHeaders })
    }

    // メディアIDを生成
    const mediaId = crypto.randomUUID()
    const r2Key = `albums/${album.id}/${mediaId}/${fileName}`

    // R2にファイルをアップロード
    const fileArrayBuffer = await file.arrayBuffer()
    await env.BUCKET.put(r2Key, fileArrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    })

    // D1にメタデータを保存
    await db.insert(medias).values({
      albumId: album.id,
      uploadUserName: uploaderName || null,
      r2Key,
      fileName,
      mimeType,
      fileSize,
    })

    // アルバムの容量使用量を更新
    await db
      .update(albums)
      .set({ storageUsed: album.storageUsed + fileSize })
      .where(eq(albums.id, album.id))

    return json(
      {
        success: true,
        mediaId,
        message: 'アップロードが完了しました',
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (e) {
    console.error('Error uploading media:', e)
    return json(
      { error: 'アップロードに失敗しました' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// 404 Handler
router.all('*', () => error(404, 'Not Found'))

// Worker Entry Point
export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return router.fetch(request, env, ctx).catch((e) => {
      console.error('Unhandled error:', e)
      return new Response('Internal Server Error', { status: 500 })
    })
  },
}
