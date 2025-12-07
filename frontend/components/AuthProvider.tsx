'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useUserStore } from '@/store/userStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { album, clearUserData, setUserData } = useUserStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // localStorage からの手動ハイドレーション
    const storeWithPersist = useUserStore as typeof useUserStore & {
      persist: { rehydrate: () => void }
    }
    storeWithPersist.persist.rehydrate()

    const checkSession = async () => {
      if (!isLoaded) return

      // ログインしていない場合、storeをクリア
      if (!isSignedIn) {
        clearUserData()
        setIsChecking(false)
        return
      }

      // ログインしているが、storeが空の場合のみAPI呼び出し（フォールバック）
      if (!album) {
        console.log('[AuthProvider] Store is empty, fetching user data...')
        try {
          const token = await getToken()
          if (token) {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
              headers: { 'Authorization': `Bearer ${token}` },
            })

            if (response.ok) {
              const data = await response.json()
              setUserData(data)
            }
          }
        } catch (error) {
          console.error('[AuthProvider] Failed to fetch user data:', error)
        }
      }

      setIsChecking(false)
    }

    checkSession()
  }, [isLoaded, isSignedIn])

  // 初期化中は何も表示しない
  if (!isLoaded || isChecking) {
    return null
  }

  return <>{children}</>
}
