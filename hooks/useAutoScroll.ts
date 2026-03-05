'use client'

import { useCallback, useEffect } from 'react'

type ScrollMode = 'top' | 'anchor'
type ElementRef<T extends Element = HTMLElement> = { current: T | null }

interface UseAutoScrollOptions {
  mode: ScrollMode
  enabled?: boolean
  containerRef?: ElementRef
  anchorRef?: ElementRef
  observeMutationsRef?: ElementRef
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  delay?: number
  retryDelays?: readonly number[]
  includeOverflowContainers?: boolean
  includeWindow?: boolean
  mutationObserverInit?: MutationObserverInit
}

const DEFAULT_RETRY_DELAYS = [0] as const
const DEFAULT_MUTATION_OBSERVER_INIT: MutationObserverInit = {
  childList: true,
  subtree: true,
}

export function useAutoScroll({
  mode,
  enabled = false,
  containerRef,
  anchorRef,
  observeMutationsRef,
  behavior,
  block = 'end',
  delay = 0,
  retryDelays = DEFAULT_RETRY_DELAYS,
  includeOverflowContainers = false,
  includeWindow = false,
  mutationObserverInit = DEFAULT_MUTATION_OBSERVER_INIT,
}: UseAutoScrollOptions) {
  const resolvedBehavior: ScrollBehavior = behavior ?? (mode === 'top' ? 'smooth' : 'auto')

  const scrollOnce = useCallback(() => {
    if (typeof window === 'undefined') return

    if (mode === 'top') {
      containerRef?.current?.scrollTo({ top: 0, behavior: resolvedBehavior })

      if (includeOverflowContainers) {
        const scrollContainers = document.querySelectorAll<HTMLElement>('.overflow-auto')
        scrollContainers.forEach((container) => {
          container.scrollTo({ top: 0, behavior: resolvedBehavior })
        })
      }

      if (includeWindow) {
        window.scrollTo({ top: 0, behavior: resolvedBehavior })
      }
      return
    }

    anchorRef?.current?.scrollIntoView({ behavior: resolvedBehavior, block })
  }, [anchorRef, block, containerRef, includeOverflowContainers, includeWindow, mode, resolvedBehavior])

  const scrollNow = useCallback(() => {
    if (typeof window === 'undefined') return
    if (delay <= 0) {
      scrollOnce()
      return
    }

    window.setTimeout(scrollOnce, delay)
  }, [delay, scrollOnce])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const timeoutIds: number[] = []
    const delays = retryDelays.length > 0 ? retryDelays : DEFAULT_RETRY_DELAYS
    delays.forEach((retryDelay) => {
      const timeoutId = window.setTimeout(scrollNow, retryDelay)
      timeoutIds.push(timeoutId)
    })

    let rafId: number | null = null
    let scrollQueued = false
    const queueScroll = () => {
      if (scrollQueued) return
      scrollQueued = true
      rafId = window.requestAnimationFrame(() => {
        scrollQueued = false
        scrollNow()
      })
    }

    const observerTarget = observeMutationsRef?.current
    const observer = observerTarget
      ? new MutationObserver(() => {
          queueScroll()
        })
      : null

    if (observer && observerTarget) {
      observer.observe(observerTarget, mutationObserverInit)
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      observer?.disconnect()
    }
  }, [enabled, mutationObserverInit, observeMutationsRef, retryDelays, scrollNow])

  return scrollNow
}
