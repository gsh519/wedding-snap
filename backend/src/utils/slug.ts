/**
 * 暗号学的に安全なslugを生成
 * 16バイトのランダムデータをbase64urlエンコード（21-22文字）
 * 例: a7B9xQwE2mPnZ1YcF3kL8r
 *
 * 衝突確率: 10億件で実質0%（UUIDv4と同等の安全性）
 */
export function generateSlug(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return base64
}
