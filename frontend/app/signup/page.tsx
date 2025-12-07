'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SignInButton, useAuth } from '@clerk/nextjs'
import { useUserStore } from '@/store/userStore'

export default function SignupPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [isChecking, setIsChecking] = useState(false)
  const { setUserData } = useUserStore()

  useEffect(() => {
    const checkUserStatus = async () => {
      // 認証状態がロードされ、既にサインイン済みの場合
      if (isLoaded && isSignedIn && !isChecking) {
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
            console.warn('Token expired or invalid, staying on signup page')
            setIsChecking(false)
            return
          }

          if (response.ok) {
            const data = await response.json()

            // storeにユーザーデータを保存
            setUserData(data)

            // アルバムが存在する場合は/wedding/:slugにリダイレクト
            if (data.album) {
              router.push(`/wedding/${data.album.slug}`)
              return
            }

            // アルバムがない場合は/signup/weddingで新規登録
            router.push('/signup/wedding')
          } else {
            // その他のエラーの場合もチェック完了として通常フローへ
            console.error('API error:', response.status)
            setIsChecking(false)
          }
        } catch (err) {
          console.error('Error checking user status:', err)
          setIsChecking(false)
        }
      }
    }

    checkUserStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  // ローディング中は何も表示しない
  if (!isLoaded || (isSignedIn && isChecking)) {
    return null
  }

  // サインイン済みの場合もリダイレクト処理中は何も表示しない
  if (isSignedIn) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-center mb-4 text-text-primary">
          結婚式を作成🎉
        </h1>
        <p className="text-center text-text-secondary mb-10">
          すぐに完了。
          <br className="sm:hidden" />
          無料でお試しいただけます。
        </p>

        {/* メインコンテンツ */}
        <div className="bg-background-card rounded-2xl shadow-lg p-6 border border-brand-accent/20">
          {/* 特徴リスト */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-brand-primary mt-1 flex-shrink-0">→</div>
              <p className="text-text-primary">
                クレジットカード情報不要で始められます
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-brand-primary mt-1 flex-shrink-0">→</div>
              <p className="text-text-primary">
                結婚式の後からでも写真を集められます
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-brand-primary mt-1 flex-shrink-0">→</div>
              <p className="text-text-primary">
                すぐに招待リンクを作成できます
              </p>
            </div>
          </div>

          {/* Googleで続けるボタン */}
          <SignInButton mode="modal">
            <button className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-full py-4 px-6 font-semibold text-gray-800 hover:bg-gray-50 transition shadow-sm mb-8">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleで始める
            </button>
          </SignInButton>

          {/* ログインリンク */}
          <p className="text-center text-sm text-text-secondary">
            アカウントをお持ちの方は{' '}
            <Link href="/login" className="text-brand-primary font-semibold hover:underline">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
