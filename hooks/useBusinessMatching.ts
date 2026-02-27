'use client'

import { useState, useCallback } from 'react'
import { runRestaurantBusinessMatching } from '@/app/actions/restaurant-leads'
import { runBankPromoBusinessMatching } from '@/app/actions/bank-promos'
import toast from 'react-hot-toast'

export type BusinessMatchingSource = 'restaurant-leads' | 'bank-promos'

export interface UseBusinessMatchingOptions {
  source: BusinessMatchingSource
  onSuccess?: () => void
}

export interface BusinessMatchingResult {
  total: number
  matched: number
  updated: number
}

export function useBusinessMatching({ source, onSuccess }: UseBusinessMatchingOptions) {
  const [matching, setMatching] = useState(false)

  const runMatch = useCallback(async () => {
    setMatching(true)
    try {
      const result =
        source === 'restaurant-leads'
          ? await runRestaurantBusinessMatching()
          : await runBankPromoBusinessMatching()

      if (result.success && result.data) {
        const { total, matched, updated } = result.data
        if (updated > 0) {
          toast.success(
            `Encontrados ${matched} de ${total} sin match. ${updated} actualizados.`
          )
          onSuccess?.()
        } else if (total === 0) {
          toast.success(
            source === 'restaurant-leads'
              ? 'Todos los restaurantes ya tienen match.'
              : 'Todas las promos ya tienen match.'
          )
        } else {
          toast.success(`No se encontraron nuevos matches (${total} sin match)`)
        }
        return result.data
      } else {
        toast.error(result.error || 'Error al buscar matches')
        return undefined
      }
    } catch (error) {
      console.error('Matching error:', error)
      toast.error('Error al buscar matches')
      return undefined
    } finally {
      setMatching(false)
    }
  }, [source, onSuccess])

  return { runMatch, matching }
}
