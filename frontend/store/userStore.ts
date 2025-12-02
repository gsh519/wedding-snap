import { create } from 'zustand'

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
  isLoading: boolean
  hasAccount: boolean

  // アクション
  setUser: (user: User | null) => void
  setAlbum: (album: Album | null) => void
  setUserData: (data: { hasAccount: boolean; user: User | null; album: Album | null }) => void
  clearUserData: () => void
  fetchUserData: (token: string) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  album: null,
  isLoading: false,
  hasAccount: false,

  setUser: (user) => set({ user }),

  setAlbum: (album) => set({ album }),

  setUserData: (data) => set({
    hasAccount: data.hasAccount,
    user: data.user,
    album: data.album,
    isLoading: false,
  }),

  clearUserData: () => set({
    user: null,
    album: null,
    hasAccount: false,
    isLoading: false,
  }),

  fetchUserData: async (token: string) => {
    set({ isLoading: true })

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        console.warn('Token expired or invalid')
        set({ isLoading: false })
        return
      }

      if (response.ok) {
        const data = await response.json()
        set({
          hasAccount: data.hasAccount,
          user: data.user,
          album: data.album,
          isLoading: false,
        })
      } else {
        console.error('API error:', response.status)
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      set({ isLoading: false })
    }
  },
}))
