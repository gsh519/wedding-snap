'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import TabBar from '@/components/TabBar'
import { QRCodeCanvas } from 'qrcode.react'
import { useUserStore } from '@/store/userStore'

// ヘルパー関数：日付を "Nov 12" 形式にフォーマット
const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

// ヘルパー関数：残り日数を計算
const calculateDaysLeft = (expireAt: string): number => {
  const expireDate = new Date(expireAt)
  const today = new Date()
  const diffTime = expireDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays) // 負の数にならないように
}

// ヘルパー関数：バイトをGBに変換
const bytesToGB = (bytes: number): string => {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1)
}

export default function Home() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [showQRModal, setShowQRModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const qrCodeRef = useRef<HTMLDivElement>(null)

  // storeからalbum情報を取得
  const { album } = useUserStore()

  // albumがnullの場合は新規会員登録画面へ遷移
  useEffect(() => {
    if (album === null) {
      alert('アカウントの登録をお願いします')
      router.push('/signup')
    }
  }, [album, router])

  // albumがnullの場合は何も表示しない（リダイレクト中）
  if (!album) {
    return null
  }

  const slug = album.slug
  const shareUrl = `https://weddingsnap.com/wedding/${slug}`

  // storeから取得したデータを整形
  const eventDate = formatEventDate(album.eventDate)
  const albumName = album.albumName
  const usedGB = bytesToGB(album.storageUsed)
  const totalGB = bytesToGB(album.storageLimit)
  const daysLeft = calculateDaysLeft(album.expireAt)
  const isFree = album.planType === 0

  // 招待文のテキスト
  const inviteMessage = `ありがとうございます！
お会いできることを楽しみにしております。

ゲストのみなさまと写真・動画をシェアするために、私たちの結婚式専用のプライベートアルバム WeddingSnap をご用意いたしました。

▼特徴
・アプリも登録も不要
・オリジナル画質で写真と動画を保存
・簡単アップロード

こちらのリンクからアクセスしてください
${shareUrl}

皆様の素敵な写真をお待ちしております！`

  // 招待リンクをコピー
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setToastMessage('リンクをコピーしました')
      setShowToast(true)
      // 3秒後にトーストを非表示
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Copy error:', error)
      setToastMessage('コピーに失敗しました')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  // 招待文をコピー
  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage)
      setToastMessage('招待文をコピーしました')
      setShowToast(true)
      setShowInviteModal(false) // モーダルを閉じる
      // 3秒後にトーストを非表示
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Copy error:', error)
      setToastMessage('コピーに失敗しました')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  // 一括ダウンロードリクエスト
  const handleDownloadRequest = async () => {
    try {
      setShowDownloadModal(false)

      // Clerkトークン取得
      const token = await getToken()

      if (!token) {
        setToastMessage('認証エラーが発生しました。ログインし直してください。')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
        return
      }

      // API呼び出し
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums/${slug}/download/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // エラーハンドリング
        if (data.upgradeRequired) {
          // 無料プランの回数制限エラー
          setToastMessage(data.message || 'ダウンロード回数の上限に達しました')
        } else {
          setToastMessage(data.error || 'エラーが発生しました')
        }
        setShowToast(true)
        setTimeout(() => setShowToast(false), 5000)
        return
      }

      // 成功時
      setToastMessage('ZIPファイルの生成を開始しました。完了後、メールでお知らせします。')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
    } catch (error) {
      console.error('Download request error:', error)
      setToastMessage('エラーが発生しました。もう一度お試しください。')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  // QRコードをダウンロード（Web Share API使用）
  const handleQRDownload = async () => {
    if (isDownloading) return

    try {
      setIsDownloading(true)

      // QRコードのCanvasを取得
      const canvas = qrCodeRef.current?.querySelector('canvas')
      if (!canvas) {
        throw new Error('QRコードの生成に失敗しました')
      }

      // CanvasをBlobに変換
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('画像の生成に失敗しました'))
          }
        }, 'image/png')
      })

      // ファイル名を生成
      const fileName = `wedding-qr-${slug}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      // Web Share API対応チェック
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Web Share APIを使用
        await navigator.share({
          files: [file],
          title: 'WeddingSnap QRコード',
          text: '結婚式の写真共有QRコード',
        })
      } else {
        // フォールバック: 従来のダウンロード方式
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
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

      {/* トースト通知 */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-white px-6 py-3 rounded-full shadow-xl border-2 border-brand-primary flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-primary to-brand-accent flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-semibold text-text-primary">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* 統計情報カード */}
        <div className="bg-background-card rounded-2xl shadow-sm border border-brand-accent/20 p-6">
          {/* 結婚式情報 */}
          <div className="text-center mb-4">
            <div className="text-sm text-text-secondary mb-1">{eventDate}</div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              {albumName}
            </h1>
          </div>

          {/* 統計情報 */}
          <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-1">
              <span>💾</span>
              <span>
                {usedGB}GB / {totalGB}GB
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>⏰</span>
              <span>あと{daysLeft}日</span>
            </div>
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
              onClick={handleCopyLink}
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
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-primary transition"
            >
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
          <button
            onClick={() => setShowDownloadModal(true)}
            className="w-full bg-brand-primary text-white font-semibold py-3 px-6 rounded-full hover:bg-brand-secondary transition"
          >
            ZIP生成してメールで受け取る
          </button>
        </div>

        {/* プランアップグレードカード（無料プランの場合のみ） */}
        {isFree && (
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
      <TabBar weddingSlug={slug} />

      {/* QRコードモーダル */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-4 text-center">QRコード</h3>
            <div
              ref={qrCodeRef}
              className="bg-white w-64 h-64 mx-auto mb-4 flex items-center justify-center rounded-lg border border-gray-200 p-4"
            >
              <QRCodeCanvas
                value={shareUrl}
                size={224}
                level="M"
              />
            </div>
            <button
              className="w-full bg-brand-primary text-white font-semibold py-3 px-6 rounded-full hover:bg-brand-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleQRDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  処理中...
                </span>
              ) : (
                'ダウンロード'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 招待文モーダル */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              onClick={() => setShowInviteModal(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* タイトル */}
            <h3 className="text-lg font-bold text-text-primary mb-4 text-center">招待文をコピー</h3>

            {/* 招待文表示エリア */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {inviteMessage}
              </p>
            </div>

            {/* コピーボタン */}
            <button
              className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 transition"
              onClick={handleCopyInvite}
            >
              コピー
            </button>
          </div>
        </div>
      )}

      {/* 一括ダウンロード確認モーダル */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDownloadModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* タイトル */}
            <h3 className="text-lg font-bold text-text-primary mb-4 text-center">📦 一括ダウンロード</h3>

            {/* 無料プランの警告 */}
            {isFree && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-800 mb-1">
                      残り1回のダウンロードを使用します
                    </p>
                    <p className="text-sm text-yellow-700">
                      有料プランでは無制限にダウンロード可能です
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 有料プランの確認 */}
            {!isFree && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">✅</span>
                  <div className="flex-1">
                    <p className="font-semibold text-green-800">
                      ZIPファイルを生成します
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 共通の注意書き */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">📧</span>
                <p className="text-sm text-blue-800">
                  生成完了後、メールでダウンロードリンクをお送りします
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">⏰</span>
                <p className="text-sm text-blue-800">
                  ダウンロードリンクは7日間のみ有効です
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📸</span>
                <p className="text-sm text-blue-800">
                  写真が多い場合、複数のZIPに分割されることがあります
                </p>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-full hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDownloadRequest}
                className="flex-1 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 transition"
              >
                生成する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
