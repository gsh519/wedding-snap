'use client'

import { useParams } from 'next/navigation'

export default function EventPage() {
  const params = useParams()
  const eventId = params.id

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">イベント: {eventId}</h2>
        <p className="text-gray-600 mb-4">
          このページから写真・動画をアップロードできます
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📤</div>
          <p className="text-gray-600 mb-4">
            ここをクリックまたはファイルをドロップ
          </p>
          <button className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition">
            ファイルを選択
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">アップロード済み</h3>
        <p className="text-gray-500 text-sm">まだ写真がアップロードされていません</p>
      </div>
    </div>
  )
}
