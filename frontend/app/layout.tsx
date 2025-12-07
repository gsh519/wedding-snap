import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/components/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'WeddingSnap - 結婚式写真共有サービス',
  description: '新郎新婦がゲストから写真・動画を簡単に集められるサービス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      signUpFallbackRedirectUrl="/signup/wedding"
      signInFallbackRedirectUrl="/signup/wedding"
    >
      <html lang="ja">
        <body className="min-h-screen bg-background-primary">
          <AuthProvider>
            {children}
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
