import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { PRESENCE_ONLINE_WINDOW_MS } from '@/lib/constants'
import { getUserProfile } from '@/lib/auth/roles'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

function normalizePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || !trimmed.startsWith('/')) return null
  return trimmed.slice(0, 160)
}

function getDisplayName(name: string | null, email: string | null, clerkId: string): string {
  if (name && name.trim()) return name.trim()
  if (email && email.trim()) return email.split('@')[0]
  return clerkId.slice(0, 8)
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS })
    }

    let path: string | null = null
    try {
      const body = await request.json()
      path = normalizePath(body?.path)
    } catch {
      // Ignore malformed body; heartbeat still updates lastSeenAt.
    }

    // Initialize profile through standard auth flow to preserve invitation role assignment.
    await getUserProfile().catch(() => null)

    const now = new Date()
    await prisma.userProfile.updateMany({
      where: { clerkId: userId },
      data: {
        lastSeenAt: now,
        activePath: path ?? undefined,
      },
    })

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('[presence] POST failed:', error)
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500, headers: NO_STORE_HEADERS })
  }
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS })
    }

    const onlineSince = new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS)
    const profiles = await prisma.userProfile.findMany({
      where: {
        isActive: true,
        lastSeenAt: { gte: onlineSince },
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
        lastSeenAt: true,
        activePath: true,
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 30,
    })

    const users = profiles.map((profile) => ({
      clerkId: profile.clerkId,
      displayName: getDisplayName(profile.name, profile.email, profile.clerkId),
      activePath: profile.activePath,
      lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
      isCurrentUser: profile.clerkId === userId,
    }))

    return NextResponse.json(
      {
        users,
        onlineCount: users.length,
        onlineWindowMs: PRESENCE_ONLINE_WINDOW_MS,
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    console.error('[presence] GET failed:', error)
    return NextResponse.json({ error: 'Failed to load presence' }, { status: 500, headers: NO_STORE_HEADERS })
  }
}
