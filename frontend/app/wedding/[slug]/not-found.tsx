import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="text-6xl">📷</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          アルバムが見つかりません
        </h1>
        <p className="text-text-secondary mb-8">
          このアルバムは存在しないか、有効期限が切れています。
        </p>
        <Link
          href="/"
          className="inline-block bg-brand-primary text-white px-6 py-3 rounded-lg hover:bg-brand-secondary transition-colors"
        >
          トップページへ戻る
        </Link>
      </div>
    </div>
  )
}
