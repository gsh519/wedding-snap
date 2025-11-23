export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          結婚式の思い出を、みんなで共有
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          URLを共有するだけで、ゲストから写真・動画を簡単に集められます
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
            無料で始める
          </button>
          <button className="border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
            詳細を見る
          </button>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl mb-4">📸</div>
          <h3 className="text-xl font-semibold mb-2">簡単共有</h3>
          <p className="text-gray-600">
            URLやQRコードを送るだけ。ゲストはログイン不要でアップロード可能
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">高速収集</h3>
          <p className="text-gray-600">
            複数のゲストから同時にアップロード。大量の写真も素早く集まります
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">一括ダウンロード</h3>
          <p className="text-gray-600">
            集まった写真・動画をまとめてダウンロード。整理も簡単
          </p>
        </div>
      </section>

      <section className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold mb-6 text-center">料金プラン</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-gray-200 p-6 rounded-lg">
            <h4 className="text-xl font-bold mb-2">無料プラン</h4>
            <p className="text-3xl font-bold text-gray-900 mb-4">¥0</p>
            <ul className="space-y-2 text-gray-600">
              <li>✓ 容量: 2GB</li>
              <li>✓ 保存期間: 30日</li>
              <li>✓ 一括ダウンロード: 1回</li>
              <li>✓ 広告表示あり</li>
            </ul>
          </div>
          <div className="border-2 border-primary-500 p-6 rounded-lg bg-primary-50">
            <h4 className="text-xl font-bold mb-2">有料プラン</h4>
            <p className="text-3xl font-bold text-primary-600 mb-4">¥800</p>
            <ul className="space-y-2 text-gray-600">
              <li>✓ 容量: 10GB</li>
              <li>✓ 保存期間: 30日</li>
              <li>✓ 一括ダウンロード: 無制限</li>
              <li>✓ 広告非表示</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
