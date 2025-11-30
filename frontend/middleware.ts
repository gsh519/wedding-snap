import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 公開ルートの定義（認証不要）
const isPublicRoute = createRouteMatcher([
  '/',
  '/signup(.*)',
  '/login(.*)',
  '/wedding/:slug(.*)', // ゲスト用公開ページ
  '/albums/:slug(.*)', // API用（下位互換）
])

export default clerkMiddleware(async (auth, request) => {
  // 公開ルート以外は認証を要求
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Next.jsの内部ファイルと静的ファイルをスキップ
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API routesとtRPCを含める
    '/(api|trpc)(.*)',
  ],
}
