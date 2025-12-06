import { Router, error, json } from 'itty-router'
import { eq, gt, and, isNull, desc, lt } from 'drizzle-orm'
import { getDb } from './db/client'
import { albums, medias, users, downloadJobs, JobStatus, PlanType } from './db/schema'
import type { Media } from './db/schema'
import {
  checkStorageLimit,
  checkAlbumExpiration,
  validateMimeType,
  validateFileSize,
} from './utils/validation'
import { generateSlug } from './utils/slug'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { STORAGE_LIMITS, ALBUM_EXPIRATION_DAYS, PLAN_TYPES } from './utils/config'
import { zip } from 'fflate'

// 型定義
export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  DOWNLOAD_QUEUE: Queue
  ENVIRONMENT: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  RESEND_API_KEY: string
  FROM_EMAIL: string
  FRONTEND_URL: string
}

// Queue メッセージ型定義
export interface DownloadJobMessage {
  jobId: number
  albumId: string
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

// 現在のユーザー情報とアルバム取得（Clerk認証後）
router.get('/api/auth/me', async (request, env: Env) => {
  try {
    const db = getDb(env.DB)

    // Authorization headerからJWTトークンを取得
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json(
        { error: '認証情報が必要です' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)

    // Clerk JWTトークンを検証
    let clerkUser
    try {
      clerkUser = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
      })
    } catch (e: any) {
      console.error('JWT verification failed in /api/auth/me:', e)
      console.error('Error details:', e.message)
      return json(
        { error: '認証に失敗しました', details: e.message },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = clerkUser.sub as string
    if (!userId) {
      return json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 400, headers: corsHeaders }
      )
    }

    // usersテーブルから取得
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const user = userResult[0]

    // ユーザーが存在しない場合は登録なし
    if (!user) {
      return json(
        {
          hasAccount: false,
          user: null,
          album: null,
        },
        { headers: corsHeaders }
      )
    }

    // アルバム情報を取得
    const albumResult = await db
      .select()
      .from(albums)
      .where(eq(albums.userId, userId))
      .limit(1)

    const album = albumResult[0]

    return json(
      {
        hasAccount: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        album: album ? {
          id: album.id,
          slug: album.slug,
          albumName: album.albumName,
          eventDate: album.eventDate,
          planType: album.planType,
          storageUsed: album.storageUsed,
          storageLimit: album.storageLimit,
          expireAt: album.expireAt,
        } : null,
      },
      { headers: corsHeaders }
    )
  } catch (e) {
    console.error('Error fetching user info:', e)
    return json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// 新規会員登録（Clerk認証後）
router.post('/api/auth/signup', async (request, env: Env) => {
  try {
    const db = getDb(env.DB)

    // Authorization headerからJWTトークンを取得
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json(
        { error: '認証情報が必要です' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7) // "Bearer "を除去

    // Clerk JWTトークンを検証
    let clerkUser
    try {
      clerkUser = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
      })
    } catch (e: any) {
      console.error('JWT verification failed in /api/auth/signup:', e)
      console.error('Error details:', e.message)
      return json(
        { error: '認証に失敗しました', details: e.message },
        { status: 401, headers: corsHeaders }
      )
    }

    // リクエストボディを取得
    const body = await request.json() as {
      albumName: string
      eventDate: string
    }

    if (!body.albumName || !body.eventDate) {
      return json(
        { error: '結婚式名と結婚式日は必須です' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Clerk User IDを取得
    const userId = clerkUser.sub as string
    if (!userId) {
      return json(
        { error: 'ユーザーIDの取得に失敗しました' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Clerk APIでユーザー詳細情報を取得
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
    })

    let clerkUserDetails
    try {
      clerkUserDetails = await clerkClient.users.getUser(userId)
    } catch (e: any) {
      console.error('Failed to fetch Clerk user details:', e)
      return json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 400, headers: corsHeaders }
      )
    }

    // メールアドレスと表示名を取得
    const email = clerkUserDetails.emailAddresses?.[0]?.emailAddress
    const displayName = clerkUserDetails.firstName && clerkUserDetails.lastName
      ? `${clerkUserDetails.firstName} ${clerkUserDetails.lastName}`
      : clerkUserDetails.firstName || clerkUserDetails.lastName || null

    if (!email) {
      return json(
        { error: 'メールアドレスの取得に失敗しました' },
        { status: 400, headers: corsHeaders }
      )
    }

    // usersテーブルに存在チェック（既存ユーザーは新規登録不可）
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (existingUser.length > 0) {
      return json(
        { error: '既に登録済みです。ログインしてください。' },
        { status: 400, headers: corsHeaders }
      )
    }

    // usersテーブルに新規登録
    await db.insert(users).values({
      id: userId,
      email: email,
      displayName: displayName || null,
    })

    // ユニークなslugを生成（衝突がなくなるまで試行）
    let slug = ''
    let isUniqueSlug = false

    while (!isUniqueSlug) {
      slug = generateSlug()

      // 同じslugが既に存在するかチェック
      const existingAlbum = await db
        .select()
        .from(albums)
        .where(eq(albums.slug, slug))
        .limit(1)

      if (existingAlbum.length === 0) {
        isUniqueSlug = true
      }
    }

    // albumsテーブルに新規アルバムを作成
    const albumId = crypto.randomUUID()
    const now = new Date()
    const expireAt = new Date(now.getTime() + ALBUM_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)

    await db.insert(albums).values({
      id: albumId,
      userId: userId,
      slug: slug,
      albumName: body.albumName,
      eventDate: body.eventDate,
      planType: PLAN_TYPES.FREE,
      storageUsed: 0,
      storageLimit: STORAGE_LIMITS.FREE_PLAN,
      downloadCount: 0,
      expireAt: expireAt.toISOString(),
    })

    return json(
      {
        success: true,
        albumId,
        slug,
        message: 'アルバムが作成されました',
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (e) {
    console.error('Error in signup:', e)
    return json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500, headers: corsHeaders }
    )
  }
})

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

// 一括ダウンロードジョブ作成（slug経由）
router.post('/api/albums/:slug/download/request', async (request, env: Env) => {
  const { slug } = request.params

  try {
    const db = getDb(env.DB)

    // Authorization headerからJWTトークンを取得
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json(
        { error: '認証情報が必要です' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)

    // Clerk JWTトークンを検証
    let clerkUser
    try {
      clerkUser = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
      })
    } catch (e: any) {
      console.error('JWT verification failed:', e)
      return json(
        { error: '認証に失敗しました' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = clerkUser.sub as string
    if (!userId) {
      return json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 400, headers: corsHeaders }
      )
    }

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

    // アルバム所有者確認
    if (album.userId !== userId) {
      return json(
        { error: 'このアルバムへのアクセス権限がありません' },
        { status: 403, headers: corsHeaders }
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

    // ダウンロード回数制限チェック（無料プランのみ）
    if (album.planType === PlanType.FREE && album.downloadCount >= 1) {
      return json(
        {
          error: 'ダウンロード回数の上限に達しました',
          message: '有料プランにアップグレードすると、無制限にダウンロードできます',
          upgradeRequired: true,
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // download_jobsテーブルに挿入
    const secretToken = crypto.randomUUID()
    const jobResult = await db
      .insert(downloadJobs)
      .values({
        userId: userId,
        albumId: album.id,
        secretToken: secretToken,
        jobStatus: JobStatus.PENDING,
        retryCount: 0,
      })
      .returning({ id: downloadJobs.id })

    const jobId = jobResult[0].id

    // downloadCountをインクリメント（無料プランのみ）
    if (album.planType === PlanType.FREE) {
      await db
        .update(albums)
        .set({ downloadCount: album.downloadCount + 1 })
        .where(eq(albums.id, album.id))
    }

    // Cloudflare Queueにエンキュー
    await env.DOWNLOAD_QUEUE.send({
      jobId,
      albumId: album.id,
    })

    return json(
      {
        success: true,
        jobId,
        message: 'ダウンロードジョブを作成しました',
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (e) {
    console.error('Error creating download job:', e)
    return json(
      { error: 'ジョブの作成に失敗しました' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// 最新のダウンロードジョブ状態取得（slug経由）
router.get('/api/albums/:slug/download/jobs/latest', async (request, env: Env) => {
  const { slug } = request.params

  try {
    const db = getDb(env.DB)

    // Authorization headerからJWTトークンを取得
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json(
        { error: '認証情報が必要です' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)

    // Clerk JWTトークンを検証
    let clerkUser
    try {
      clerkUser = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
      })
    } catch (e: any) {
      console.error('JWT verification failed:', e)
      return json(
        { error: '認証に失敗しました' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = clerkUser.sub as string
    if (!userId) {
      return json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 400, headers: corsHeaders }
      )
    }

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

    // アルバム所有者確認
    if (album.userId !== userId) {
      return json(
        { error: 'このアルバムへのアクセス権限がありません' },
        { status: 403, headers: corsHeaders }
      )
    }

    // 最新のdownload_jobを取得
    const jobResult = await db
      .select()
      .from(downloadJobs)
      .where(eq(downloadJobs.albumId, album.id))
      .orderBy(downloadJobs.createdAt)
      .limit(1)

    const job = jobResult[0]

    // ジョブが存在しない場合はnullを返す
    if (!job) {
      return json(
        { job: null },
        { headers: corsHeaders }
      )
    }

    // JobStatusを文字列に変換
    const statusMap: Record<number, string> = {
      [JobStatus.PENDING]: 'PENDING',
      [JobStatus.PROCESSING]: 'PROCESSING',
      [JobStatus.COMPLETED]: 'COMPLETED',
      [JobStatus.FAILED]: 'FAILED',
    }

    return json(
      {
        job: {
          jobId: job.id,
          jobStatus: statusMap[job.jobStatus] || 'UNKNOWN',
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          totalFiles: job.totalFiles,
          zipCount: job.zipCount,
          secretToken: job.secretToken,
        },
      },
      { headers: corsHeaders }
    )
  } catch (e) {
    console.error('Error fetching job status:', e)
    return json(
      { error: 'ジョブ情報の取得に失敗しました' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// ZIP配信API（認証不要・secretTokenで認証）
router.get('/api/download/:token', async (request, env: Env) => {
  const { token } = request.params

  try {
    const db = getDb(env.DB)
    const url = new URL(request.url)

    // secretTokenでdownload_jobを取得
    const jobResult = await db
      .select()
      .from(downloadJobs)
      .where(eq(downloadJobs.secretToken, token))
      .limit(1)

    const job = jobResult[0]
    if (!job) {
      return new Response('ダウンロードリンクが無効です', { status: 404, headers: corsHeaders })
    }

    // ジョブステータス確認
    if (job.jobStatus !== JobStatus.COMPLETED) {
      return new Response('まだ準備ができていません', { status: 400, headers: corsHeaders })
    }

    // 7日間期限チェック
    if (job.completedAt) {
      const completedDate = new Date(job.completedAt)
      const expiryDate = new Date(completedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      const now = new Date()

      if (now > expiryDate) {
        return new Response('ダウンロード期限が切れています（7日経過）', { status: 410, headers: corsHeaders })
      }
    }

    // ZIPファイルのR2キーを取得
    if (!job.zipR2Keys) {
      return new Response('ZIPファイルが見つかりません', { status: 404, headers: corsHeaders })
    }

    const keys = JSON.parse(job.zipR2Keys) as string[]
    const index = parseInt(url.searchParams.get('index') || '0')

    if (index < 0 || index >= keys.length) {
      return new Response('無効なZIPインデックスです', { status: 400, headers: corsHeaders })
    }

    const r2Key = keys[index]
    const filename = `wedding-photos-${index + 1}.zip`

    // R2からZIPファイル取得
    const object = await env.BUCKET.get(r2Key)
    if (!object) {
      return new Response('ファイルが見つかりません', { status: 404, headers: corsHeaders })
    }

    // ストリーミング配信
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0',
    }

    return new Response(object.body, { headers })
  } catch (e) {
    console.error('Error serving ZIP file:', e)
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

// ========================================
// Queue Consumer用ヘルパー関数
// ========================================

/**
 * 1つのZIPファイルを生成してR2にアップロード
 * @param mediaList - ZIPに含めるメディアのリスト
 * @param albumId - アルバムID
 * @param batchIndex - バッチインデックス（0, 1, 2...）
 * @param env - 環境変数
 * @returns R2キー
 */
async function createZipFile(
  mediaList: Media[],
  albumId: string,
  batchIndex: number,
  env: Env
): Promise<string> {
  const zipKey = `zips/${albumId}/batch-${batchIndex}-${Date.now()}.zip`

  // fflateでZIP圧縮するためのファイルマップ
  const files: Record<string, Uint8Array> = {}

  // 各メディアファイルをR2から取得して、filesマップに追加
  for (const media of mediaList) {
    try {
      const object = await env.BUCKET.get(media.r2Key)
      if (object) {
        const buffer = await object.arrayBuffer()
        files[media.fileName] = new Uint8Array(buffer)
      }
    } catch (e) {
      console.error(`Failed to fetch media ${media.id} from R2:`, e)
      // エラーが発生してもスキップして続行
    }
  }

  // ZIP圧縮を実行
  const zipBuffer = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  // R2にZIPファイルをアップロード
  await env.BUCKET.put(zipKey, zipBuffer, {
    httpMetadata: {
      contentType: 'application/zip',
    },
  })

  return zipKey
}

/**
 * ダウンロードジョブを処理（ZIP生成）
 * @param jobId - ジョブID
 * @param albumId - アルバムID
 * @param env - 環境変数
 */
async function processDownloadJob(jobId: number, albumId: string, env: Env): Promise<void> {
  const db = getDb(env.DB)

  try {
    // 1. ジョブをPROCESSINGに更新
    await db
      .update(downloadJobs)
      .set({ jobStatus: JobStatus.PROCESSING })
      .where(eq(downloadJobs.id, jobId))

    // 2. アルバムの全メディアを取得（削除済みを除外）
    const mediaList = await db
      .select()
      .from(medias)
      .where(and(eq(medias.albumId, albumId), isNull(medias.deletedAt)))
      .orderBy(medias.id)

    if (mediaList.length === 0) {
      // メディアが0件の場合はFAILED
      await db
        .update(downloadJobs)
        .set({
          jobStatus: JobStatus.FAILED,
          completedAt: new Date().toISOString(),
        })
        .where(eq(downloadJobs.id, jobId))
      return
    }

    // 3. 500枚ごとにバッチ分割
    const BATCH_SIZE = 500
    const batches: Media[][] = []
    for (let i = 0; i < mediaList.length; i += BATCH_SIZE) {
      batches.push(mediaList.slice(i, i + BATCH_SIZE))
    }

    // 4. 各バッチでZIP生成
    const zipR2Keys: string[] = []
    for (let i = 0; i < batches.length; i++) {
      const zipKey = await createZipFile(batches[i], albumId, i, env)
      zipR2Keys.push(zipKey)
    }

    // 5. ジョブをCOMPLETEDに更新
    await db
      .update(downloadJobs)
      .set({
        jobStatus: JobStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        totalFiles: mediaList.length,
        zipCount: batches.length,
        zipR2Keys: JSON.stringify(zipR2Keys),
      })
      .where(eq(downloadJobs.id, jobId))

    // 6. メール送信
    try {
      // 完了したジョブ情報を取得
      const completedJob = await db
        .select()
        .from(downloadJobs)
        .where(eq(downloadJobs.id, jobId))
        .limit(1)

      if (completedJob.length > 0) {
        const job = completedJob[0]

        // アルバム情報を取得
        const albumResult = await db
          .select()
          .from(albums)
          .where(eq(albums.id, albumId))
          .limit(1)

        // ユーザー情報を取得
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.id, job.userId))
          .limit(1)

        if (albumResult.length > 0 && userResult.length > 0) {
          const album = albumResult[0]
          const user = userResult[0]

          await sendDownloadReadyEmail(
            {
              id: job.id,
              secretToken: job.secretToken,
              zipCount: job.zipCount || 1,
              totalFiles: job.totalFiles || 0,
            },
            user.email,
            album.albumName,
            env
          )
        }
      }
    } catch (emailError) {
      console.error('Failed to send email, but job completed successfully:', emailError)
      // メール送信失敗してもジョブは成功
    }

    console.log(`Job ${jobId} completed successfully. Generated ${batches.length} ZIP(s) with ${mediaList.length} files.`)
  } catch (e) {
    console.error(`Job ${jobId} failed:`, e)

    // ジョブをFAILEDに更新
    const job = await db
      .select()
      .from(downloadJobs)
      .where(eq(downloadJobs.id, jobId))
      .limit(1)

    if (job.length > 0) {
      const retryCount = job[0].retryCount + 1
      const maxRetries = 3

      if (retryCount >= maxRetries) {
        // 最大リトライ回数に達したらFAILED
        await db
          .update(downloadJobs)
          .set({
            jobStatus: JobStatus.FAILED,
            retryCount,
          })
          .where(eq(downloadJobs.id, jobId))
      } else {
        // リトライカウントを増やしてPENDINGに戻す
        await db
          .update(downloadJobs)
          .set({
            jobStatus: JobStatus.PENDING,
            retryCount,
          })
          .where(eq(downloadJobs.id, jobId))

        // 再度Queueにエンキュー
        await env.DOWNLOAD_QUEUE.send({ jobId, albumId })
      }
    }

    throw e
  }
}

// ========================================
// メール送信ヘルパー関数
// ========================================

/**
 * ダウンロード準備完了メールを送信
 * @param job - ダウンロードジョブ
 * @param userEmail - 送信先メールアドレス
 * @param albumName - アルバム名
 * @param env - 環境変数
 */
async function sendDownloadReadyEmail(
  job: { id: number; secretToken: string; zipCount: number; totalFiles: number },
  userEmail: string,
  albumName: string,
  env: Env
): Promise<void> {
  try {
    // ダウンロードリンクを生成
    const downloadLinks: string[] = []
    for (let i = 0; i < job.zipCount; i++) {
      downloadLinks.push(`${env.FRONTEND_URL}/download/${job.secretToken}?index=${i}`)
    }

    // メール本文（HTML）
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>写真のダウンロード準備が完了しました</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- ヘッダー -->
    <div style="background: linear-gradient(135deg, #FF6B9D 0%, #FFA06B 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">📸 WeddingSnap</h1>
    </div>

    <!-- メインコンテンツ -->
    <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: bold;">写真のダウンロード準備が完了しました 🎉</h2>

      <p style="margin: 0 0 24px 0; color: #4b5563; line-height: 1.6;">
        こんにちは！<br>
        「<strong>${albumName}</strong>」の写真（全${job.totalFiles}枚）のZIPファイル生成が完了しました。
      </p>

      <!-- ダウンロードリンク -->
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">📦 ダウンロードリンク</h3>
        ${downloadLinks.map((link, index) => `
          <div style="margin-bottom: 12px;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #FF6B9D 0%, #FFA06B 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 24px; font-weight: 600; font-size: 14px;">
              📥 ZIP ${downloadLinks.length > 1 ? `(${index + 1}/${downloadLinks.length})` : ''} をダウンロード
            </a>
          </div>
        `).join('')}
      </div>

      <!-- 重要な注意事項 -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">⚠️ 重要</h4>
        <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
          <li>ダウンロードリンクは<strong>7日間のみ有効</strong>です</li>
          <li>期限を過ぎるとファイルは自動的に削除されます</li>
          <li>お早めにダウンロードをお願いします</li>
        </ul>
      </div>

      <!-- 補足情報 -->
      <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;">📸 写真が多い場合、ファイルサイズの都合で複数のZIPに分割されています</p>
        <p style="margin: 0;">🔒 このリンクは秘密のURLです。他の人と共有しないようご注意ください</p>
      </div>
    </div>

    <!-- フッター -->
    <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">© 2024 WeddingSnap. All rights reserved.</p>
      <p style="margin: 8px 0 0 0;">このメールは自動送信されています。返信はできません。</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    // テキスト版（HTMLをサポートしないメールクライアント用）
    const textBody = `
【WeddingSnap】写真のダウンロード準備が完了しました

こんにちは！

「${albumName}」の写真（全${job.totalFiles}枚）のZIPファイル生成が完了しました。

■ ダウンロードリンク
${downloadLinks.map((link, index) => `ZIP ${downloadLinks.length > 1 ? `(${index + 1}/${downloadLinks.length})` : ''}: ${link}`).join('\n')}

⚠️ 重要な注意事項
- ダウンロードリンクは7日間のみ有効です
- 期限を過ぎるとファイルは自動的に削除されます
- お早めにダウンロードをお願いします

📸 写真が多い場合、ファイルサイズの都合で複数のZIPに分割されています
🔒 このリンクは秘密のURLです。他の人と共有しないようご注意ください

© 2024 WeddingSnap. All rights reserved.
このメールは自動送信されています。返信はできません。
    `.trim()

    // Resend API呼び出し
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [userEmail],
        subject: '【WeddingSnap】写真のダウンロード準備が完了しました',
        html: htmlBody,
        text: textBody,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send email via Resend:', response.status, errorText)
      throw new Error(`Resend API error: ${response.status}`)
    }

    const result = await response.json() as { id: string }
    console.log(`Email sent successfully to ${userEmail}. Resend ID: ${result.id}`)
  } catch (error) {
    console.error('Error sending email:', error)
    // メール送信失敗してもジョブは成功扱いにする（ユーザーは別の方法でダウンロードできるため）
  }
}

// ========================================
// Cron用ヘルパー関数
// ========================================

/**
 * 7日経過したダウンロードジョブのクリーンアップ
 * - R2からZIPファイルを削除
 * - DBから物理削除
 */
async function cleanupExpiredDownloadJobs(env: Env): Promise<void> {
  const db = getDb(env.DB)

  // 1. 完了から7日経過したジョブを取得
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const expiredJobs = await db
    .select()
    .from(downloadJobs)
    .where(
      and(
        eq(downloadJobs.jobStatus, JobStatus.COMPLETED),
        lt(downloadJobs.completedAt, sevenDaysAgo)
      )
    )

  console.log(`Found ${expiredJobs.length} expired jobs to clean up`)

  // 2. 各ジョブのZIPファイルをR2から削除し、DBからも削除
  for (const job of expiredJobs) {
    try {
      // zipR2KeysからZIPを削除
      if (job.zipR2Keys) {
        const keys = JSON.parse(job.zipR2Keys) as string[]
        for (const key of keys) {
          await env.BUCKET.delete(key)
          console.log(`Deleted ZIP from R2: ${key}`)
        }
      }

      // DBから物理削除
      await db
        .delete(downloadJobs)
        .where(eq(downloadJobs.id, job.id))

      console.log(`Deleted job ${job.id} from database`)
    } catch (error) {
      console.error(`Failed to cleanup job ${job.id}:`, error)
      // エラーが発生しても続行
    }
  }

  console.log(`Cleanup completed. Processed ${expiredJobs.length} jobs.`)
}

// 404 Handler
router.all('*', () => error(404, 'Not Found'))

// Worker Entry Point
export default {
  // HTTP Requestハンドラー
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return router.fetch(request, env, ctx).catch((e) => {
      console.error('Unhandled error:', e)
      return new Response('Internal Server Error', { status: 500 })
    })
  },

  // Queue Consumerハンドラー
  async queue(batch: MessageBatch<DownloadJobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { jobId, albumId } = message.body

      try {
        console.log(`Processing job ${jobId} for album ${albumId}`)
        await processDownloadJob(jobId, albumId, env)
        message.ack()
      } catch (error) {
        console.error(`Job ${jobId} processing failed:`, error)
        // リトライ処理はprocessDownloadJob内で行われるため、ここではackする
        message.ack()
      }
    }
  },

  // Scheduled (Cron) ハンドラー
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled cleanup job...')
    try {
      await cleanupExpiredDownloadJobs(env)
      console.log('Scheduled cleanup job completed successfully')
    } catch (error) {
      console.error('Scheduled cleanup job failed:', error)
    }
  },
}
