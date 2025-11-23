import type { Metadata } from 'next'
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
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
