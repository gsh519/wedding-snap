'use client'

import { useParams } from 'next/navigation'

export default function EventPage() {
  const params = useParams()
  const eventId = params.id

  return (
    <div className="space-y-6">
      <div className="bg-background-card p-6 rounded-lg shadow-sm border border-brand-accent/20">
        <h2 className="text-2xl font-bold mb-4 text-text-primary">イベント: {eventId}</h2>
        <p className="text-text-secondary mb-4">
          このページから写真・動画をアップロードできます
        </p>

        <div className="border-2 border-dashed border-brand-primary/40 rounded-lg p-12 text-center bg-brand-accent/5 hover:bg-brand-accent/10 transition">
          <div className="text-4xl mb-4">📤</div>
          <p className="text-text-secondary mb-4">
            ここをクリックまたはファイルをドロップ
          </p>
          <button className="bg-brand-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition">
            ファイルを選択
          </button>
        </div>
      </div>

      <div className="bg-background-card p-6 rounded-lg shadow-sm border border-brand-accent/20">
        <h3 className="text-xl font-bold mb-4 text-text-primary">アップロード済み</h3>
        <p className="text-text-secondary text-sm">まだ写真がアップロードされていません</p>
      </div>
    </div>
  )
}
