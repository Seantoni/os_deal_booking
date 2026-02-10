import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth/roles'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Always fetch fresh from database to ensure sync
    // The cache is causing issues with role updates, so we'll fetch directly
    // and rely on client-side caching instead
    const profile = await getUserProfile()
    const role = (profile?.role as 'admin' | 'sales' | 'editor' | 'editor_senior' | 'ere' | 'marketing') || 'sales'
    
    // Return with no-cache headers to prevent browser caching
    return NextResponse.json({ role }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get role' }, { status: 500 })
  }
}
