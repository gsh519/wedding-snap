import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 型定義
export interface Album {
  id: string
  slug: string
  albumName: string
  eventDate: string
  planType: number
  storageUsed: number
  storageLimit: number
  expireAt: string
}

export interface User {
  id: string
  email: string
  displayName: string | null
}

interface UserState {
  user: User | null
  album: Album | null

  // アクション
  setUserData: (data: { user: User | null; album: Album | null }) => void
  clearUserData: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      album: null,

      setUserData: (data) => set({
        user: data.user,
        album: data.album,
      }),

      clearUserData: () => set({
        user: null,
        album: null,
      }),
    }),
    {
      name: 'wedding-snap-user', // localStorage のキー名
      // 永続化するフィールドを明示的に指定
      partialize: (state) => ({
        user: state.user,
        album: state.album,
      }),
      skipHydration: true, // SSRハイドレーションミスマッチを防ぐ
    }
  )
)
