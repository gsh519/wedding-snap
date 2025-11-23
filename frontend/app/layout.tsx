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
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-primary-600">WeddingSnap</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-white mt-auto border-t">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
            © 2024 WeddingSnap. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  )
}
