'use client'

import { useState, useEffect } from 'react'

export type UserRole = 'admin' | 'sales' | null

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      try {
        const response = await fetch('/api/user/role')
        if (response.ok) {
          const data = await response.json()
          setRole(data.role)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  return { role, loading, isAdmin: role === 'admin', isSales: role === 'sales' }
}

