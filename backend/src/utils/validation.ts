import { Album } from '../db/schema'

/**
 * アルバムの容量制限をチェック
 */
export function checkStorageLimit(
  album: Album,
  additionalSize: number
): { canUpload: boolean; message?: string } {
  const newTotalSize = album.storageUsed + additionalSize

  if (newTotalSize > album.storageLimit) {
    const limitMB = Math.floor(album.storageLimit / 1024 / 1024)
    const usedMB = Math.floor(album.storageUsed / 1024 / 1024)
    const additionalMB = Math.floor(additionalSize / 1024 / 1024)

    return {
      canUpload: false,
      message: `容量制限を超えています。制限: ${limitMB}MB、使用中: ${usedMB}MB、追加: ${additionalMB}MB`,
    }
  }

  return { canUpload: true }
}

/**
 * アルバムの有効期限をチェック
 */
export function checkAlbumExpiration(album: Album): { isValid: boolean; message?: string } {
  const now = new Date()
  const expireAt = new Date(album.expireAt)

  if (now > expireAt) {
    return {
      isValid: false,
      message: 'このアルバムの有効期限が切れています',
    }
  }

  return { isValid: true }
}

/**
 * MIME typeのバリデーション
 */
export function validateMimeType(mimeType: string): { isValid: boolean; message?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'video/mp4',
    'video/quicktime',
  ]

  if (!allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      message: `未対応のファイル形式です: ${mimeType}`,
    }
  }

  return { isValid: true }
}

/**
 * ファイルサイズのバリデーション
 */
export function validateFileSize(
  mimeType: string,
  fileSize: number
): { isValid: boolean; message?: string } {
  const isImage = mimeType.startsWith('image/')
  const maxSize = isImage ? 20 * 1024 * 1024 : 100 * 1024 * 1024 // 写真20MB、動画100MB

  if (fileSize > maxSize) {
    const maxSizeMB = Math.floor(maxSize / 1024 / 1024)
    const fileSizeMB = Math.floor(fileSize / 1024 / 1024)

    return {
      isValid: false,
      message: `ファイルサイズが大きすぎます。最大: ${maxSizeMB}MB、実際: ${fileSizeMB}MB`,
    }
  }

  return { isValid: true }
}
