'use client'

import { useEffect, useMemo, useState } from 'react'
import { getBusinessSentRequestAgingMap } from '@/app/actions/businesses'
import type { BusinessSentRequestAgingRecord } from '@/lib/business'

type AgingMap = Record<string, BusinessSentRequestAgingRecord>

export function useBusinessApprovedRequestAging(businessIds: string[]) {
  const normalizedBusinessIds = useMemo(
    () => [...new Set(businessIds.filter(Boolean))].sort(),
    [businessIds]
  )
  const [data, setData] = useState<AgingMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (normalizedBusinessIds.length === 0) {
        setData({})
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await getBusinessSentRequestAgingMap(normalizedBusinessIds)
        if (cancelled) return

        if (result.success && result.data) {
          setData(result.data as AgingMap)
        } else {
          setData({})
          setError(('error' in result && result.error) || 'Failed to load business request send aging')
        }
      } catch (loadError) {
        if (cancelled) return
        setData({})
        setError(loadError instanceof Error ? loadError.message : 'Failed to load business request send aging')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [normalizedBusinessIds])

  return {
    data,
    loading,
    error,
  }
}
