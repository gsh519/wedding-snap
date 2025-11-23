export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h2 className="text-4xl font-bold text-text-primary mb-4">
          結婚式の思い出を、みんなで共有
        </h2>
        <p className="text-xl text-text-secondary mb-8">
          URLを共有するだけで、ゲストから写真・動画を簡単に集められます
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
            無料で始める
          </button>
          <button className="border-2 border-brand-primary text-brand-primary px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary hover:text-white transition">
            詳細を見る
          </button>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-brand-accent/20">
          <div className="text-3xl mb-4">📸</div>
          <h3 className="text-xl font-semibold mb-2 text-text-primary">簡単共有</h3>
          <p className="text-text-secondary">
            URLやQRコードを送るだけ。ゲストはログイン不要でアップロード可能
          </p>
        </div>
        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-brand-accent/20">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2 text-text-primary">高速収集</h3>
          <p className="text-text-secondary">
            複数のゲストから同時にアップロード。大量の写真も素早く集まります
          </p>
        </div>
        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-brand-accent/20">
          <div className="text-3xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2 text-text-primary">一括ダウンロード</h3>
          <p className="text-text-secondary">
            集まった写真・動画をまとめてダウンロード。整理も簡単
          </p>
        </div>
      </section>

      <section className="bg-background-card p-8 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold mb-6 text-center text-text-primary">料金プラン</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-brand-primary/30 p-6 rounded-lg">
            <h4 className="text-xl font-bold mb-2 text-text-primary">無料プラン</h4>
            <p className="text-3xl font-bold text-text-primary mb-4">¥0</p>
            <ul className="space-y-2 text-text-secondary">
              <li>✓ 容量: 2GB</li>
              <li>✓ 保存期間: 30日</li>
              <li>✓ 一括ダウンロード: 1回</li>
              <li>✓ 広告表示あり</li>
            </ul>
          </div>
          <div className="border-2 border-brand-cta p-6 rounded-lg bg-brand-accent/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-cta text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              おすすめ
            </div>
            <h4 className="text-xl font-bold mb-2 text-text-primary">有料プラン</h4>
            <p className="text-3xl font-bold text-brand-cta mb-4">¥800</p>
            <ul className="space-y-2 text-text-secondary">
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
