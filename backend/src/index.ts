import { Router, error, json } from 'itty-router'
import { eq, gt } from 'drizzle-orm'
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

// メディア一覧取得（slug経由・ページネーション対応）
router.get('/api/albums/:slug/media', async (request, env: Env) => {
  const { slug } = request.params

  try {
    const db = getDb(env.DB)
    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor')
    const limit = parseInt(url.searchParams.get('limit') || '30')

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
        { status: 404, headers: corsHeaders }
      )
    }

    // メディア一覧取得（カーソルベースページネーション）
    let query = db
      .select()
      .from(medias)
      .where(eq(medias.albumId, album.id))
      .orderBy(medias.id)
      .$dynamic()

    // カーソルがある場合は、そのID以降を取得
    if (cursor) {
      const cursorId = parseInt(cursor)
      if (!isNaN(cursorId)) {
        query = query.where(gt(medias.id, cursorId))
      }
    }

    // limit+1件取得して、hasNextPageを判定
    const mediaList = await query.limit(limit + 1)

    const hasNextPage = mediaList.length > limit
    const mediaToReturn = hasNextPage ? mediaList.slice(0, limit) : mediaList

    // レスポンス用にURLを追加
    const mediaWithUrls = mediaToReturn.map((media) => ({
      id: media.id,
      albumId: media.albumId,
      uploadUserName: media.uploadUserName,
      fileName: media.fileName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      url: `/api/albums/${slug}/media/${media.id}/file`,
      createdAt: media.createdAt,
    }))

    const nextCursor = hasNextPage ? mediaToReturn[mediaToReturn.length - 1].id.toString() : null

    return json(
      {
        media: mediaWithUrls,
        pagination: {
          nextCursor,
          hasNextPage,
        },
      },
      { headers: corsHeaders }
    )
  } catch (e) {
    console.error('Error fetching media:', e)
    return json(
      { error: 'メディアの取得に失敗しました' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// メディアファイル配信（R2プロキシ）
router.get('/api/albums/:slug/media/:mediaId/file', async (request, env: Env) => {
  const { slug, mediaId } = request.params

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
      return new Response('アルバムが見つかりません', { status: 404, headers: corsHeaders })
    }

    // 有効期限チェック
    const expirationCheck = checkAlbumExpiration(album)
    if (!expirationCheck.isValid) {
      return new Response('このアルバムは有効期限が切れています', { status: 404, headers: corsHeaders })
    }

    // メディア取得
    const mediaIdNum = parseInt(mediaId)
    if (isNaN(mediaIdNum)) {
      return new Response('無効なメディアIDです', { status: 404, headers: corsHeaders })
    }

    const mediaResult = await db
      .select()
      .from(medias)
      .where(eq(medias.id, mediaIdNum))
      .limit(1)

    const media = mediaResult[0]
    if (!media || media.albumId !== album.id || media.deletedAt) {
      return new Response('メディアが見つかりません', { status: 404, headers: corsHeaders })
    }

    // R2からファイル取得
    const object = await env.BUCKET.get(media.r2Key)
    if (!object) {
      return new Response('ファイルが見つかりません', { status: 404, headers: corsHeaders })
    }

    // ファイルを返却
    const headers = {
      ...corsHeaders,
      'Content-Type': media.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    return new Response(object.body, { headers })
  } catch (e) {
    console.error('Error serving media file:', e)
    return new Response('ファイルの取得に失敗しました', { status: 500, headers: corsHeaders })
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
        // TODO: 文言変更
        { status: 404, headers: corsHeaders }
      )
    }

    // 有効期限チェック
    const expirationCheck = checkAlbumExpiration(album)
    if (!expirationCheck.isValid) {
      return json(
        { error: expirationCheck.message },
        // TODO: 有効期限切れの文言を表示する。エラーページに遷移
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
        // TODO: アップロードに失敗しました。
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
      // TODO: ここで引っかかると以降の処理を終了させる
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
