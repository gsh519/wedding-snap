'use client'

interface NotificationBannerProps {
  message: string
  type: 'success' | 'warning' | 'error'
  isVisible: boolean
  onClose: () => void
}

export default function NotificationBanner({ message, type, isVisible, onClose }: NotificationBannerProps) {
  if (!isVisible) return null

  // タイプ別のスタイル設定
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✅',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '❌',
    },
  }

  const currentStyle = styles[type]

  return (
    <div
      className={`sticky top-16 z-30 ${currentStyle.bg} border-b ${currentStyle.border} px-4 py-3 shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* アイコンとメッセージ */}
        <div className="flex items-start gap-2 flex-1">
          <span className="text-xl flex-shrink-0">{currentStyle.icon}</span>
          <p className={`${currentStyle.text} text-sm font-medium leading-relaxed break-words`}>
            {message}
          </p>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className={`${currentStyle.text} hover:opacity-70 transition-opacity flex-shrink-0 p-1`}
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
