import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const publicPaths = ['/']
  if (publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
}