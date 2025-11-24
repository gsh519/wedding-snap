'use client'

import { useState } from 'react'
import TabBar from '@/components/TabBar'

// モックデータ
const mockData = {
  weddingInfo: {
    date: 'Nov 12',
    names: 'Yuto & Mei',
    slug: 'a7x9k2p4',
  },
  stats: {
    photosCount: 3,
    moviesCount: 0,
    totalMinutes: 0,
    usedGB: 0.5,
    totalGB: 2,
    daysLeft: 23,
  },
  plan: {
    isFree: true,
  },
}

export default function Home() {
  const [showQRModal, setShowQRModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const shareUrl = `https://weddingsnap.com/wedding/${mockData.weddingInfo.slug}`

  return (
    <div className="min-h-screen bg-background-primary pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 左: ロゴ */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">📷</span>
            <span className="font-semibold text-text-primary">WeddingSnap</span>
          </div>

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

            {/* ログアウト */}
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* 統計情報カード */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          {/* 結婚式情報 */}
          <div className="text-center mb-4">
            <div className="text-sm text-text-secondary mb-1">{mockData.weddingInfo.date}</div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              {mockData.weddingInfo.names}
            </h1>
          </div>

          {/* 統計情報 */}
          <div className="flex items-center justify-center gap-4 text-sm text-text-secondary mb-2">
            <div className="flex items-center gap-1">
              <span>💾</span>
              <span>
                {mockData.stats.usedGB}GB / {mockData.stats.totalGB}GB
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>⏰</span>
              <span>あと{mockData.stats.daysLeft}日</span>
            </div>
          </div>

          {/* 写真・動画枚数 */}
          <div className="text-center text-sm text-text-secondary">
            {mockData.stats.photosCount} photos, {mockData.stats.moviesCount} movies,{' '}
            {mockData.stats.totalMinutes} minutes
          </div>
        </div>

        {/* ゲスト招待カード */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          <h2 className="text-lg font-bold text-text-primary text-center mb-4">
            ゲストを招待しましょう！
          </h2>
          <p className="text-sm text-text-secondary text-center mb-6">
            ゲストは何名でも参加できます
          </p>

          {/* 3つのボタン */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* QRコード */}
            <button
              onClick={() => setShowQRModal(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-primary transition"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </div>
              <span className="text-xs text-text-primary font-medium">QRコード</span>
            </button>

            {/* 招待リンク */}
            <button
              onClick={() => setShowLinkModal(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-primary transition"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <span className="text-xs text-text-primary font-medium">招待リンク</span>
            </button>

            {/* 招待文 */}
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-primary transition">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <span className="text-xs text-text-primary font-medium">招待文</span>
            </button>
          </div>

          {/* 注記 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 text-center">
              招待リンクやQRコードは、アップグレードや設定の変更後も変わりませんのでご安心ください
            </p>
          </div>
        </div>

        {/* 一括ダウンロードセクション */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">📦 一括ダウンロード</h2>

          {/* ZIP生成ボタン */}
          <button className="w-full bg-brand-primary text-white font-semibold py-3 px-6 rounded-full hover:bg-brand-secondary transition">
            ZIP生成してメールで受け取る
          </button>
        </div>

        {/* プランアップグレードカード（無料プランの場合のみ） */}
        {mockData.plan.isFree && (
          <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl shadow-sm border border-brand-accent/20 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full flex-shrink-0">
                <span className="text-xl">⭐</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text-primary mb-2">
                  あとはアップグレードだけ
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  いつアップグレードしても&quot;挙式日&quot;から30日後まで使用可能{' '}
                  <a href="#" className="text-brand-primary underline">
                    式を結んだ方へ
                  </a>
                </p>
                <button className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 transition">
                  アップグレード
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* タブバー */}
      <TabBar weddingSlug={mockData.weddingInfo.slug} />

      {/* QRコードモーダル */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-4 text-center">QRコード</h3>
            <div className="bg-gray-100 w-64 h-64 mx-auto mb-4 flex items-center justify-center rounded-lg">
              <span className="text-gray-400">QR Code Here</span>
            </div>
            <button className="w-full bg-brand-primary text-white font-semibold py-3 px-6 rounded-full hover:bg-brand-secondary transition">
              ダウンロード
            </button>
          </div>
        </div>
      )}

      {/* リンクコピーモーダル */}
      {showLinkModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLinkModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-4 text-center">招待リンク</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-text-primary break-all">{shareUrl}</p>
            </div>
            <button
              className="w-full bg-brand-primary text-white font-semibold py-3 px-6 rounded-full hover:bg-brand-secondary transition"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl)
                alert('リンクをコピーしました！')
              }}
            >
              コピー
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
