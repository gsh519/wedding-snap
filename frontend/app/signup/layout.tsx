import Link from 'next/link'

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="bg-white">
        <div className="px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-800">
            WeddingSnap
          </Link>
        </div>
      </header>
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  )
}
