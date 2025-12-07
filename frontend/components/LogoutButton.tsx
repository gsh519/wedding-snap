'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/userStore'

export function LogoutButton() {
  const { signOut } = useAuth()
  const { clearUserData } = useUserStore()
  const router = useRouter()

  const handleLogout = async () => {
    // 1. store をクリア（localStorage もクリアされる）
    clearUserData()

    // 2. Clerk のログアウト
    await signOut()

    // 3. ログインページへリダイレクト
    router.push('/signup')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full bg-gray-500 text-white font-semibold py-3 px-6 rounded-full hover:bg-gray-600 transition flex items-center justify-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      ログアウト
    </button>
  )
}
