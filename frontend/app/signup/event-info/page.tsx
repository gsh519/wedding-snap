'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EventInfoPage() {
  const router = useRouter()
  const [weddingName, setWeddingName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: バックエンドAPI連携（結婚式情報の登録）
    // 一旦、ホーム画面に遷移
    router.push('/')
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-center mb-2">
          結婚式情報を入力
        </h1>
        <p className="text-center text-gray-600 mb-10">
          あとから変更することもできます
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* 入力フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 結婚式名 */}
            <div>
              <label
                htmlFor="weddingName"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                結婚式名
              </label>
              <input
                type="text"
                id="weddingName"
                value={weddingName}
                onChange={(e) => setWeddingName(e.target.value)}
                placeholder="Yuto & Mei"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                例: Yuto & Mei、太郎と花子の結婚式
              </p>
            </div>

            {/* 結婚式日 */}
            <div>
              <label
                htmlFor="weddingDate"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                結婚式日
              </label>
              <input
                type="date"
                id="weddingDate"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                結婚式の開催日を選択してください
              </p>
            </div>

            {/* 作成ボタン */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-400 to-pink-300 text-white font-semibold py-4 rounded-full hover:from-pink-500 hover:to-pink-400 transition shadow-md"
            >
              作成する
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
