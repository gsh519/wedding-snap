'use client'

import Link from 'next/link'
import Masonry from 'react-masonry-css'
import { useState, use } from 'react'
import TabBar from '@/components/TabBar'

// モックデータ（将来的にAPIから取得）
const mockPhotos = [
  { id: 1, url: 'https://picsum.photos/seed/wedding1/400/600', width: 400, height: 600 },
  { id: 2, url: 'https://picsum.photos/seed/wedding2/400/300', width: 400, height: 300 },
  { id: 3, url: 'https://picsum.photos/seed/wedding3/400/500', width: 400, height: 500 },
  { id: 4, url: 'https://picsum.photos/seed/wedding4/400/450', width: 400, height: 450 },
  { id: 5, url: 'https://picsum.photos/seed/wedding5/400/550', width: 400, height: 550 },
  { id: 6, url: 'https://picsum.photos/seed/wedding6/400/400', width: 400, height: 400 },
  { id: 7, url: 'https://picsum.photos/seed/wedding7/400/350', width: 400, height: 350 },
  { id: 8, url: 'https://picsum.photos/seed/wedding8/400/500', width: 400, height: 500 },
]

export default function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [isOwner] = useState(true) // 仮: 新郎新婦としてログイン中
  const [selectedPhoto, setSelectedPhoto] = useState<typeof mockPhotos[0] | null>(null)

  // Masonryのブレークポイント設定
  const breakpointColumns = {
    default: 4, // PC: 4カラム
    1024: 3,    // タブレット: 3カラム
    640: 2,     // スマホ: 2カラム
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

      {/* 写真グリッド */}
      <div className="px-2 py-4">
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex -ml-2 w-auto"
          columnClassName="pl-2 bg-clip-padding"
        >
          {mockPhotos.map((photo) => (
            <div
              key={photo.id}
              className="mb-2 cursor-pointer group relative overflow-hidden rounded-lg"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={`Photo ${photo.id}`}
                className="w-full h-auto block transition-transform group-hover:scale-105"
              />
              {/* ホバー時のオーバーレイ */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
            </div>
          ))}
        </Masonry>
      </div>

      {/* FAB（アップロードボタン） */}
      <button className="fixed bottom-24 right-6 bg-brand-primary text-white rounded-full p-4 shadow-lg hover:bg-brand-secondary transition-colors z-20">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* タブバー（新郎新婦のみ） */}
      {isOwner && <TabBar weddingSlug={slug} />}

      {/* 写真拡大モーダル（タップ時） */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <img
              src={selectedPhoto.url}
              alt={`Photo ${selectedPhoto.id}`}
              className="w-full h-auto rounded-lg"
            />
            {/* 閉じるボタン */}
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
              onClick={() => setSelectedPhoto(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
