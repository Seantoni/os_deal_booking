'use client'

import RouteError from '@/components/common/RouteError'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return <RouteError error={error} reset={reset} title="Negocios" context="businesses" />
}
