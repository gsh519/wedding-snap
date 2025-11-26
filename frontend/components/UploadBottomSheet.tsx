'use client'

import { useState, useRef, useEffect } from 'react'

interface UploadBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[], uploaderName: string) => Promise<void>
}

export default function UploadBottomSheet({ isOpen, onClose, onUpload }: UploadBottomSheetProps) {
  const [uploaderName, setUploaderName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // ファイル形式チェック
    const validFiles = files.filter(file => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/heic',
        'video/mp4',
        'video/quicktime'
      ]
      return validTypes.includes(file.type)
    })

    // ファイルサイズチェック
    const validSizedFiles = validFiles.filter(file => {
      const isImage = file.type.startsWith('image/')
      const maxSize = isImage ? 20 * 1024 * 1024 : 100 * 1024 * 1024 // 写真20MB、動画100MB
      return file.size <= maxSize
    })

    if (validSizedFiles.length !== files.length) {
      alert('一部のファイルが制限を超えているため除外されました。\n写真: 20MB以下、動画: 100MB以下')
    }

    setSelectedFiles(validSizedFiles)
  }

  const handleUploadClick = () => {
    if (selectedFiles.length === 0) {
      alert('写真または動画を選択してください')
      return
    }

    if (!uploaderName.trim()) {
      alert('お名前を入力してください')
      return
    }

    // アップロード処理を開始（親コンポーネントで処理）
    onUpload(selectedFiles, uploaderName.trim())

    // 状態をリセット
    setSelectedFiles([])
    setUploaderName('')
  }

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setSelectedFiles([])
      setUploaderName('')
      onClose()
    }, 300) // アニメーション時間と同じ
  }

  if (!isOpen) return null

  return (
    <>
      {/* オーバーレイ */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* ボトムシート */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl max-h-[80vh] overflow-y-auto transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-6 pb-8">
          {/* ハンドル */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* タイトル */}
          <h2 className="text-xl font-bold text-text-primary mb-6">写真・動画をアップロード</h2>

          {/* 投稿者名入力 */}
          <div className="mb-6">
            <label htmlFor="uploader-name" className="block text-sm font-medium text-gray-700 mb-2">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              id="uploader-name"
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              maxLength={50}
            />
          </div>

          {/* ファイル選択ボタン */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/heic,video/mp4,video/quicktime"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {selectedFiles.length > 0 ? `${selectedFiles.length}件選択中` : '写真・動画を選択'}
                </span>
                <span className="text-xs text-gray-500">
                  写真: 20MB以下、動画: 100MB以下
                </span>
              </div>
            </button>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              キャンセル
            </button>
            <button
              onClick={handleUploadClick}
              disabled={selectedFiles.length === 0 || !uploaderName.trim()}
              className="flex-1 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              アップロード
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
