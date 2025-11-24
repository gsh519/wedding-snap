'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TabBarProps {
  weddingSlug?: string
}

export default function TabBar({ weddingSlug }: TabBarProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex items-center justify-around py-1.5">
        {/* ホーム */}
        <Link
          href="/home"
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            pathname === '/home' ? 'text-brand-primary' : 'text-gray-600 hover:text-brand-primary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className={`text-xs ${pathname === '/home' ? 'font-semibold' : ''}`}>ホーム</span>
        </Link>

        {/* ギャラリー */}
        <Link
          href={weddingSlug ? `/wedding/${weddingSlug}` : '#'}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            pathname?.startsWith('/wedding')
              ? 'text-brand-primary'
              : 'text-gray-600 hover:text-brand-primary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className={`text-xs ${pathname?.startsWith('/wedding') ? 'font-semibold' : ''}`}>
            ギャラリー
          </span>
        </Link>

        {/* 設定 */}
        <Link
          href="/setting"
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            pathname === '/setting' ? 'text-brand-primary' : 'text-gray-600 hover:text-brand-primary'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className={`text-xs ${pathname === '/setting' ? 'font-semibold' : ''}`}>設定</span>
        </Link>
      </div>
    </nav>
  )
}
