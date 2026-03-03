'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { PRESENCE_HEARTBEAT_MS, PRESENCE_POLL_MS } from '@/lib/constants'

export interface LivePresenceUser {
  clerkId: string
  displayName: string
  activePath: string | null
  lastSeenAt: string | null
  isCurrentUser: boolean
}

interface PresenceResponse {
  users?: LivePresenceUser[]
}

export function useLivePresence() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const userId = user?.id ?? null
  const [users, setUsers] = useState<LivePresenceUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      setUsers([])
      setLoading(false)
      return
    }

    let isMounted = true

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ path: pathname }),
        })
      } catch {
        // Heartbeat failures are non-blocking.
      }
    }

    const loadOnlineUsers = async (initialLoad = false) => {
      try {
        const response = await fetch('/api/presence', { cache: 'no-store' })
        if (!response.ok) return

        const data = (await response.json()) as PresenceResponse
        if (isMounted) {
          setUsers(Array.isArray(data.users) ? data.users : [])
        }
      } catch {
        // Poll failures are non-blocking.
      } finally {
        if (initialLoad && isMounted) {
          setLoading(false)
        }
      }
    }

    void sendHeartbeat()
    void loadOnlineUsers(true)

    const heartbeatInterval = window.setInterval(() => {
      void sendHeartbeat()
    }, PRESENCE_HEARTBEAT_MS)

    const pollInterval = window.setInterval(() => {
      void loadOnlineUsers()
    }, PRESENCE_POLL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
        void loadOnlineUsers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearInterval(heartbeatInterval)
      window.clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoaded, pathname, userId])

  return {
    users,
    loading,
    onlineCount: users.length,
  }
}
