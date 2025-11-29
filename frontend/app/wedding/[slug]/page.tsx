'use client'

import Link from 'next/link'
import Masonry from 'react-masonry-css'
import { useState, use, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import { useSwipeable } from 'react-swipeable'
import TabBar from '@/components/TabBar'
import UploadBottomSheet from '@/components/UploadBottomSheet'
import NotificationBanner from '@/components/NotificationBanner'

// 型定義
type MediaItem = {
  id: number
  albumId: string
  uploadUserName: string | null
  fileName: string
  mimeType: string
  fileSize: number
  url: string
  createdAt: string
}

export default function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [isOwner] = useState(true) // 仮: 新郎新婦としてログイン中

  // メディア関連のstate
  const [media, setMedia] = useState<MediaItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMedia, setIsLoadingMedia] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)

  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(-1)
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('アップロード中...')

  // 無限スクロール用のref
  const observerTarget = useRef<HTMLDivElement>(null)

  // 通知バナー用の state
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'warning' | 'error'
    isVisible: boolean
  }>({
    message: '',
    type: 'success',
    isVisible: false,
  })

  // Masonryのブレークポイント設定
  const breakpointColumns = {
    default: 4, // PC: 4カラム
    1024: 3,    // タブレット: 3カラム
    640: 2,     // スマホ: 2カラム
  }

  // メディア一覧を取得する関数
  const fetchMedia = async (cursor: string | null = null) => {
    try {
      const params = new URLSearchParams()
      if (cursor) {
        params.append('cursor', cursor)
      }
      params.append('limit', '30')

      const response = await fetch(
        `http://localhost:8787/api/albums/${slug}/media?${params.toString()}`
      )

      if (response.status === 404) {
        notFound()
      }

      if (!response.ok) {
        throw new Error('メディアの取得に失敗しました')
      }

      const data = await response.json()
      return {
        media: data.media as MediaItem[],
        nextCursor: data.pagination.nextCursor as string | null,
        hasNextPage: data.pagination.hasNextPage as boolean,
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'NEXT_NOT_FOUND') {
        throw error
      }
      console.error('Error fetching media:', error)
      throw new Error('メディアの読み込みに失敗しました')
    }
  }

  // 初回読み込み
  useEffect(() => {
    const loadInitialMedia = async () => {
      try {
        setIsLoadingMedia(true)
        setMediaError(null)
        const result = await fetchMedia()
        setMedia(result.media)
        setNextCursor(result.nextCursor)
        setHasNextPage(result.hasNextPage)
      } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_NOT_FOUND') {
          throw error
        }
        setMediaError(error instanceof Error ? error.message : 'エラーが発生しました')
      } finally {
        setIsLoadingMedia(false)
      }
    }

    loadInitialMedia()
  }, [slug])

  // 次ページを読み込む関数
  const loadMoreMedia = async () => {
    if (!hasNextPage || isLoadingMore || !nextCursor) return

    try {
      setIsLoadingMore(true)
      const result = await fetchMedia(nextCursor)
      setMedia((prev) => [...prev, ...result.media])
      setNextCursor(result.nextCursor)
      setHasNextPage(result.hasNextPage)
    } catch (error) {
      console.error('Error loading more media:', error)
      setNotification({
        message: '追加の読み込みに失敗しました',
        type: 'error',
        isVisible: true,
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  // 無限スクロールの設定
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          loadMoreMedia()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasNextPage, isLoadingMore, nextCursor])

  // 1ファイルをアップロードする関数
  const uploadSingleFile = async (file: File, uploaderName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploaderName', uploaderName)
      formData.append('fileName', file.name)
      formData.append('mimeType', file.type)
      formData.append('fileSize', file.size.toString())

      const response = await fetch(`http://localhost:8787/api/albums/${slug}/media/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || 'アップロードに失敗しました' }
      }

      return { success: true }
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }

  // アップロード処理（10ファイル並列）
  const handleUpload = async (files: File[], uploaderName: string) => {
    console.log('Uploading files:', files.length, 'by', uploaderName)

    setIsUploadSheetOpen(false) // ボトムシートを閉じる

    // 少し待ってから進捗バーを表示（ボトムシートのアニメーション完了後）
    await new Promise(resolve => setTimeout(resolve, 300))

    setIsUploading(true)
    setUploadProgress(0)
    setUploadMessage('アップロード中...')

    const totalFiles = files.length
    let completedFiles = 0
    const errors: string[] = []

    // 進捗更新用のヘルパー関数
    const updateProgress = () => {
      const progress = Math.floor((completedFiles / totalFiles) * 100)
      setUploadProgress(progress)
      setUploadMessage(`アップロード中... ${completedFiles}/${totalFiles}件`)
    }

    try {
      // 10ファイルずつ並列アップロード
      const BATCH_SIZE = 10
      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE)

        // 各ファイルのアップロードをPromiseにラップして、完了時に進捗を更新
        const uploadPromises = batch.map(async (file) => {
          const result = await uploadSingleFile(file, uploaderName)

          // アップロード完了したら即座に進捗を更新
          if (result.success) {
            completedFiles++
          } else {
            errors.push(`${file.name}: ${result.error}`)
          }
          updateProgress()

          return result
        })

        await Promise.all(uploadPromises)
      }

      // 進捗バーを非表示にする
      setIsUploading(false)
      setUploadProgress(0)

      // 完了メッセージを通知バナーに表示
      if (errors.length === 0) {
        // 全て成功
        setNotification({
          message: `${completedFiles}件のアップロードが完了しました`,
          type: 'success',
          isVisible: true,
        })
        // メディア一覧を再読み込み
        const result = await fetchMedia()
        setMedia(result.media)
        setNextCursor(result.nextCursor)
        setHasNextPage(result.hasNextPage)
      } else if (completedFiles > 0) {
        // 一部成功、一部失敗
        const firstError = errors[0] // 最初のエラーを表示
        setNotification({
          message: `${completedFiles}/${totalFiles}件のアップロードが完了しました。エラー: ${firstError}`,
          type: 'warning',
          isVisible: true,
        })
        // 一部成功した場合もメディア一覧を再読み込み
        const result = await fetchMedia()
        setMedia(result.media)
        setNextCursor(result.nextCursor)
        setHasNextPage(result.hasNextPage)
      } else {
        // 全て失敗
        const firstError = errors[0] // 最初のエラーを表示
        setNotification({
          message: `アップロードに失敗しました。エラー: ${firstError}`,
          type: 'error',
          isVisible: true,
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setIsUploading(false)
      setUploadProgress(0)
      setNotification({
        message: 'アップロード中に予期しないエラーが発生しました',
        type: 'error',
        isVisible: true,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background-primary pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 左: ロゴ */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📷</span>
            <span className="font-semibold text-text-primary">WeddingSnap</span>
          </Link>

          {/* 右: アイコン群 */}
          <div className="flex items-center gap-4">
            {/* メニュー */}
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </button>

            {/* 一括ダウンロード（新郎新婦のみ） */}
            {isOwner && (
              <Link href="/home" className="text-brand-primary hover:text-brand-secondary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 通知バナー（進捗バーが非表示のときのみ表示） */}
      {!isUploading && (
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={() => setNotification({ ...notification, isVisible: false })}
        />
      )}

      {/* 進捗バー（アップロード中のみ表示） */}
      {isUploading && (
        <div className="sticky top-16 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-md">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">{uploadMessage}</span>
            <span className="font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-primary h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 写真グリッド */}
      <div className="px-2 py-4">
        {isLoadingMedia ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">読み込み中...</p>
            </div>
          </div>
        ) : mediaError ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <p className="text-red-500 mb-4">{mediaError}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-brand-primary text-white px-6 py-2 rounded-lg hover:bg-brand-secondary transition-colors"
              >
                再読み込み
              </button>
            </div>
          </div>
        ) : media.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <p className="text-4xl mb-4">📷</p>
              <p className="text-text-secondary">まだ写真がアップロードされていません</p>
              <p className="text-text-secondary text-sm mt-2">右下のボタンから写真を追加できます</p>
            </div>
          </div>
        ) : (
          <>
            <Masonry
              breakpointCols={breakpointColumns}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {media.map((item, index) => (
                <div
                  key={item.id}
                  className="mb-2 cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => {
                    setSelectedPhoto(item)
                    setSelectedPhotoIndex(index)
                  }}
                >
                  {item.mimeType.startsWith('image/') ? (
                    <img
                      src={`http://localhost:8787${item.url}`}
                      alt={item.fileName}
                      className="w-full h-auto block transition-transform group-hover:scale-105"
                    />
                  ) : item.mimeType.startsWith('video/') ? (
                    <video
                      src={`http://localhost:8787${item.url}`}
                      className="w-full h-auto block"
                      preload="metadata"
                    />
                  ) : null}
                  {/* ホバー時のオーバーレイ */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                </div>
              ))}
            </Masonry>

            {/* 無限スクロール用のトリガー要素 */}
            <div ref={observerTarget} className="h-4" />

            {/* 追加読み込み中の表示 */}
            {isLoadingMore && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB（アップロードボタン） */}
      <button
        onClick={() => setIsUploadSheetOpen(true)}
        className="fixed bottom-24 right-6 bg-brand-primary text-white rounded-full p-4 shadow-lg hover:bg-brand-secondary transition-colors z-20"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* タブバー（新郎新婦のみ） */}
      {isOwner && <TabBar weddingSlug={slug} />}

      {/* 写真拡大モーダル（タップ時） */}
      {selectedPhoto && selectedPhotoIndex >= 0 && (
        <PhotoModal
          media={media}
          currentIndex={selectedPhotoIndex}
          onClose={() => {
            setSelectedPhoto(null)
            setSelectedPhotoIndex(-1)
          }}
          onNavigate={(newIndex) => {
            setSelectedPhotoIndex(newIndex)
            setSelectedPhoto(media[newIndex])
          }}
        />
      )}

      {/* アップロードボトムシート */}
      <UploadBottomSheet
        isOpen={isUploadSheetOpen}
        onClose={() => setIsUploadSheetOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  )
}

// 写真拡大モーダルコンポーネント
function PhotoModal({
  media,
  currentIndex,
  onClose,
  onNavigate,
}: {
  media: MediaItem[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const currentMedia = media[currentIndex]
  const totalCount = media.length
  const [isDownloading, setIsDownloading] = useState(false)

  // 前の写真に移動
  const goToPrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1)
    }
  }

  // 次の写真に移動
  const goToNext = () => {
    if (currentIndex < totalCount - 1) {
      onNavigate(currentIndex + 1)
    }
  }

  // スワイプハンドラー
  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrevious,
    trackMouse: false, // マウスドラッグは無効化（誤操作防止）
  })

  // ダウンロード処理
  const handleDownload = async () => {
    if (isDownloading) return

    try {
      setIsDownloading(true)

      // 画像URLを取得
      const imageUrl = `http://localhost:8787${currentMedia.url}`

      // 画像をfetchしてBlobを取得
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('画像の取得に失敗しました')
      }

      const blob = await response.blob()
      const file = new File([blob], currentMedia.fileName, { type: currentMedia.mimeType })

      // Web Share API対応チェック
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Web Share APIを使用（スマホで「写真に追加」が表示される）
        await navigator.share({
          files: [file],
          title: currentMedia.fileName,
        })
      } else {
        // フォールバック: 従来のダウンロード方式
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = currentMedia.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      // ユーザーがキャンセルした場合はエラーを無視
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Share cancelled by user')
        return
      }

      console.error('Download error:', error)
      alert('ダウンロードに失敗しました。もう一度お試しください。')
    } finally {
      setIsDownloading(false)
    }
  }

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, totalCount])

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* メインコンテンツエリア */}
      <div
        {...swipeHandlers}
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 画像/動画表示 */}
        <div className="relative max-w-4xl max-h-full w-full flex items-center justify-center">
          {currentMedia.mimeType.startsWith('image/') ? (
            <img
              src={`http://localhost:8787${currentMedia.url}`}
              alt={currentMedia.fileName}
              className="max-w-full max-h-[calc(100vh-8rem)] w-auto h-auto object-contain"
            />
          ) : currentMedia.mimeType.startsWith('video/') ? (
            <video
              src={`http://localhost:8787${currentMedia.url}`}
              controls
              className="max-w-full max-h-[calc(100vh-8rem)] w-auto h-auto"
            />
          ) : null}
        </div>

        {/* 左ナビゲーションボタン */}
        {currentIndex > 0 && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white p-2 hover:opacity-70 transition-opacity z-10"
            onClick={goToPrevious}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* 右ナビゲーションボタン */}
        {currentIndex < totalCount - 1 && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white p-2 hover:opacity-70 transition-opacity z-10"
            onClick={goToNext}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 下部情報バー */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4">
          {/* インデックス表示（左下） */}
          <div className="text-white bg-black bg-opacity-50 px-3 py-2 rounded-lg text-sm font-medium">
            {currentIndex + 1} / {totalCount}
          </div>

          {/* 閉じるボタン（中央） */}
          <button
            className="text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* ダウンロードボタン（右下） */}
          <button
            className="text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
