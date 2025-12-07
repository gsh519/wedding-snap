'use client'

import TabBar from '@/components/TabBar'
import { LogoutButton } from '@/components/LogoutButton'
import { useUserStore } from '@/store/userStore'

// 日付フォーマット関数（ISO形式 -> YYYY/M/D形式）
const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

export default function SettingPage() {
  // storeからユーザー情報とアルバム情報を取得
  const { user, album } = useUserStore()
  const slug = album?.slug || ''

  return (
    <div className="min-h-screen bg-background-primary pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 左: タイトル */}
          <h1 className="text-xl font-bold text-text-primary">設定</h1>

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

            {/* ヘルプ */}
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* 結婚式名 */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          <label className="block text-sm font-semibold text-text-primary mb-3">結婚式名</label>
          <input
            type="text"
            defaultValue={album?.albumName || ''}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent mb-3"
            placeholder="例: Yuto & Mei"
          />
          <button className="w-full bg-brand-primary text-white font-semibold py-3 px-6 rounded-full hover:bg-brand-secondary transition">
            保存
          </button>
        </div>

        {/* 結婚式のプラン */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
            <span className="text-2xl">📦</span>
            {album?.planType === 0 ? '無料トライアル' : '有料プラン'}
          </h2>
          <p className="text-sm text-text-secondary mb-4">~ {formatDate(album?.expireAt)}</p>
          <button className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 transition mb-6">
            プランをアップグレード
          </button>

          {/* 安心のアップグレード */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              安心のアップグレード
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-text-primary">決済日ではなく挙式日から</p>
                  <p className="text-text-secondary">挙式日から30日間利用可能</p>
                  <p className="text-xs text-text-secondary mt-1">
                    ※既に挙式を結んだ方はWeddingShare登録日から30日間
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-text-primary">すべて画質アップ</p>
                  <p className="text-text-secondary">
                    アップグレード前に投稿された写真・動画も、ダウンロード画質がアップ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 30日以降も思い出を楽しむ */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-text-primary mb-2">30日以降も思い出を楽しむ</h2>
          <p className="text-sm text-text-secondary mb-4">
            保存期間を延長して、いつでも思い出を振り返ることができます
          </p>
          <button className="text-brand-primary font-semibold text-sm hover:underline">
            詳しく見る →
          </button>
        </div>

        {/* アカウント情報 */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">アカウント</h3>
          <LogoutButton />
        </div>
      </main>

      {/* タブバー */}
      <TabBar weddingSlug={slug} />
    </div>
  )
}
