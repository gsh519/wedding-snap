'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function EventInfoPage() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [weddingName, setWeddingName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUserAlbum = async () => {
      if (isLoaded && isSignedIn) {
        setIsChecking(true)
        try {
          const token = await getToken()
          if (!token) {
            setIsChecking(false)
            return
          }

          // バックエンドAPIでユーザー情報を取得
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          // 401エラー（認証失敗）の場合は、認証状態をリセットして通常フローへ
          if (response.status === 401) {
            console.warn('Token expired or invalid, continuing signup flow')
            setIsChecking(false)
            return
          }

          if (response.ok) {
            const data = await response.json()

            // アルバムが既に存在する場合は/wedding/:slugにリダイレクト
            if (data.album) {
              router.push(`/wedding/${data.album.slug}`)
              return
            }
          } else {
            // その他のエラーの場合もチェック完了として通常フローへ
            console.error('API error:', response.status)
          }
        } catch (err) {
          console.error('Error checking user album:', err)
        } finally {
          setIsChecking(false)
        }
      } else if (isLoaded && !isSignedIn) {
        // サインインしていない場合は/signupにリダイレクト
        router.push('/signup')
      }
    }

    checkUserAlbum()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Clerkセッショントークンを取得
      const token = await getToken()
      if (!token) {
        setError('認証情報の取得に失敗しました')
        setIsLoading(false)
        return
      }

      // バックエンドAPI呼び出し
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumName: weddingName,
          eventDate: weddingDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'アカウントの作成に失敗しました。時間をあけて再度お試しください。')
        setIsLoading(false)
        return
      }

      // 成功したら/wedding/:slugへリダイレクト
      router.push(`/wedding/${data.slug}`)
    } catch (err) {
      console.error('Error creating album:', err)
      setError('アカウントの作成に失敗しました。時間をあけて再度お試しください。')
      setIsLoading(false)
    }
  }

  // ローディング中またはリダイレクト処理中は何も表示しない
  if (!isLoaded || isChecking) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-center mb-2 text-text-primary">
          結婚式情報を入力
        </h1>
        <p className="text-center text-text-secondary mb-10">
          あとから変更することもできます
        </p>

        <div className="bg-background-card rounded-2xl shadow-lg p-6 border border-brand-accent/20">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 入力フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 結婚式名 */}
            <div>
              <label
                htmlFor="weddingName"
                className="block text-sm font-semibold text-text-primary mb-2"
              >
                結婚式名
              </label>
              <input
                type="text"
                id="weddingName"
                value={weddingName}
                onChange={(e) => setWeddingName(e.target.value)}
                placeholder="Yuto & Mei"
                className="w-full px-4 py-3 border border-brand-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                required
              />
              <p className="mt-2 text-xs text-text-secondary">
                例: Yuto & Mei、太郎と花子の結婚式
              </p>
            </div>

            {/* 結婚式日 */}
            <div>
              <label
                htmlFor="weddingDate"
                className="block text-sm font-semibold text-text-primary mb-2"
              >
                結婚式日
              </label>
              <input
                type="date"
                id="weddingDate"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-4 py-3 border border-brand-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                required
              />
              <p className="mt-2 text-xs text-text-secondary">
                結婚式の開催日を選択してください
              </p>
            </div>

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-primary text-white font-semibold py-4 rounded-full hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '作成中...' : '作成する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
