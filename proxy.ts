import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET
const key = secretKey ? new TextEncoder().encode(secretKey) : null

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const { pathname } = request.nextUrl

  // Allow auth routes and public assets
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!key) {
    console.error('[Security Error] JWT_SECRET is not configured in proxy environment.')
    return new NextResponse('Internal Server Security Configuration Error', { status: 500 })
  }

  try {
    const { payload } = await jwtVerify(session, key, { algorithms: ['HS256'] })
    const user = payload.user as any

    // If manager tries to access restricted areas
    if (user.role === 'MANAGER') {
      // MANAGER is allowed to access:
      // 1. /stores/{user.storeId}
      // 2. /reports (scoped to their own store)
      if (
        pathname === '/' ||
        pathname === '/stores' ||
        pathname === '/products' ||
        pathname === '/forecast' ||
        pathname === '/audit'
      ) {
        if (user.storeId) {
          return NextResponse.redirect(new URL(`/stores/${user.storeId}`, request.url))
        }
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // If manager tries to access another store's page (exact segment match)
      if (pathname.startsWith('/stores/')) {
        const pathSegments = pathname.split('/').filter(Boolean)
        const targetStoreId = pathSegments[1]
        if (targetStoreId && targetStoreId !== user.storeId) {
          return NextResponse.redirect(new URL(`/stores/${user.storeId}`, request.url))
        }
      }
    }

    return NextResponse.next()
  } catch {
    // Invalid token
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
}
