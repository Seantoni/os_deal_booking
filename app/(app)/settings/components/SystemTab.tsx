'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { testOpenAIConnection } from '@/app/actions/openai'

interface ServiceStatus {
  status: 'idle' | 'checking' | 'connected' | 'error' | 'not_configured'
  error?: string | null
  details?: string | null
}

export default function SystemTab() {
  const { user } = useUser()
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [dbError, setDbError] = useState<string | null>(null)
  const [openaiStatus, setOpenaiStatus] = useState<ServiceStatus>({ status: 'idle' })
  const [resendStatus, setResendStatus] = useState<ServiceStatus>({ status: 'idle' })
  const [ofertaApiStatus, setOfertaApiStatus] = useState<ServiceStatus>({ status: 'idle' })
  const [s3Status, setS3Status] = useState<ServiceStatus>({ status: 'idle' })
  const [sentryStatus, setSentryStatus] = useState<ServiceStatus>({ status: 'idle' })
  const [cronStatus, setCronStatus] = useState<ServiceStatus>({ status: 'idle' })

  useEffect(() => {
    checkDatabaseStatus()
    checkConfigStatuses()
  }, [])

  async function checkDatabaseStatus() {
    setDbStatus('checking')
    try {
      const response = await fetch('/api/health/database')
      const data = await response.json()
      setDbStatus(data.connected ? 'connected' : 'error')
      setDbError(data.error || null)
    } catch (error) {
      setDbStatus('error')
      setDbError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async function checkConfigStatuses() {
    try {
      const response = await fetch('/api/external-oferta/test')
      const data = await response.json()
      setOfertaApiStatus({
        status: data.configured ? 'connected' : 'not_configured',
        details: data.configured ? 'Token configured' : null
      })
    } catch {
      setOfertaApiStatus({ status: 'error', error: 'Check failed' })
    }

    try {
      const response = await fetch('/api/health/config')
      const data = await response.json()
      
      setResendStatus({
        status: data.resend?.configured ? 'connected' : 'not_configured',
        details: data.resend?.configured ? 'Configured' : null
      })
      
      setS3Status({
        status: data.s3?.configured ? 'connected' : 'not_configured',
        details: data.s3?.bucket || null
      })
      
      setSentryStatus({
        status: data.sentry?.configured ? 'connected' : 'not_configured',
      })
      
      setCronStatus({
        status: data.cron?.configured ? 'connected' : 'not_configured',
      })
    } catch {
      setResendStatus({ status: 'idle' })
      setS3Status({ status: 'idle' })
      setSentryStatus({ status: 'idle' })
      setCronStatus({ status: 'idle' })
    }
  }

  async function checkOpenAIStatus() {
    setOpenaiStatus({ status: 'checking' })
    try {
      const response = await testOpenAIConnection()
      setOpenaiStatus(response.success 
        ? { status: 'connected', details: response.model || null }
        : { status: 'error', error: response.error || 'Failed' }
      )
    } catch (error) {
      setOpenaiStatus({ status: 'error', error: error instanceof Error ? error.message : 'Error' })
    }
  }

  async function testOfertaSimpleApi() {
    setOfertaApiStatus({ status: 'checking' })
    try {
      const response = await fetch('/api/external-oferta/test', { method: 'POST' })
      let data
      try {
        data = await response.json()
      } catch {
        setOfertaApiStatus({ status: 'error', error: `HTTP ${response.status} (no JSON)` })
        return
      }
      if (data.success) {
        setOfertaApiStatus({ status: 'connected', details: `ID: ${data.externalId}` })
      } else {
        // Extract error from various formats
        const err = data.errorMessage 
          || (typeof data.error === 'string' ? data.error : null)
          || data.hint
          || `HTTP ${data.status || response.status}`
        setOfertaApiStatus({ status: 'error', error: err })
      }
    } catch (error) {
      setOfertaApiStatus({ status: 'error', error: error instanceof Error ? error.message : 'Network error' })
    }
  }

  async function testResendEmail() {
    setResendStatus({ status: 'checking' })
    try {
      const response = await fetch('/api/health/resend')
      const data = await response.json()
      setResendStatus(data.success
        ? { status: 'connected', details: 'Verified' }
        : { status: data.configured === false ? 'not_configured' : 'error', error: data.error }
      )
    } catch {
      setResendStatus({ status: 'error', error: 'Test failed' })
    }
  }

  const statusColors = {
    connected: 'bg-green-500',
    checking: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500',
    not_configured: 'bg-orange-400',
    idle: 'bg-gray-300'
  }

  const statusLabels = {
    connected: '✓',
    checking: '...',
    error: '✗',
    not_configured: '⚠',
    idle: '?'
  }

  const ServiceRow = ({ 
    name, 
    desc, 
    status, 
    details, 
    error,
    onTest 
  }: { 
    name: string
    desc: string
    status: ServiceStatus['status']
    details?: string | null
    error?: string | null
    onTest?: () => void
  }) => (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[status]}`} />
        <div className="min-w-0">
          <span className="text-sm font-medium text-gray-900">{name}</span>
          <span className="text-xs text-gray-500 ml-2">{desc}</span>
          {details && <span className="text-xs text-gray-400 ml-2">({details})</span>}
          {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-bold w-5 text-center ${
          status === 'connected' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          status === 'not_configured' ? 'text-orange-600' :
          'text-gray-400'
        }`}>
          {statusLabels[status]}
        </span>
        {onTest && status !== 'checking' && (
          <button
            onClick={onTest}
            className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            Test
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Core Services */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Core Services</h3>
          <div className="space-y-1">
            <ServiceRow
              name="Clerk"
              desc="Auth"
              status={user ? 'connected' : 'error'}
            />
            <ServiceRow
              name="Database"
              desc="Neon PostgreSQL"
              status={dbStatus === 'checking' ? 'checking' : dbStatus === 'connected' ? 'connected' : 'error'}
              error={dbError}
              onTest={checkDatabaseStatus}
            />
            <ServiceRow
              name="OpenAI"
              desc="AI Features"
              status={openaiStatus.status}
              details={openaiStatus.details}
              error={openaiStatus.error}
              onTest={checkOpenAIStatus}
            />
          </div>
        </div>

        {/* OfertaSimple APIs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">OfertaSimple APIs</h3>
          <div className="space-y-1">
            <ServiceRow
              name="Deal API"
              desc="Send deals"
              status={ofertaApiStatus.status}
              details={ofertaApiStatus.details}
              error={ofertaApiStatus.error}
              onTest={testOfertaSimpleApi}
            />
            <ServiceRow
              name="Vendor API"
              desc="Send vendors"
              status={ofertaApiStatus.status}
            />
            <ServiceRow
              name="Metrics API"
              desc="Sync metrics"
              status={ofertaApiStatus.status}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-mono">EXTERNAL_OFERTA_API_TOKEN</p>
        </div>

        {/* Communication */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Communication & Storage</h3>
          <div className="space-y-1">
            <ServiceRow
              name="Resend"
              desc="Email notifications"
              status={resendStatus.status}
              details={resendStatus.details}
              error={resendStatus.error}
              onTest={resendStatus.status !== 'not_configured' ? testResendEmail : undefined}
            />
            <ServiceRow
              name="AWS S3"
              desc="Image uploads"
              status={s3Status.status}
              details={s3Status.details}
            />
          </div>
        </div>

        {/* Monitoring */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Monitoring & Jobs</h3>
          <div className="space-y-1">
            <ServiceRow
              name="Sentry"
              desc="Error tracking"
              status={sentryStatus.status}
            />
            <ServiceRow
              name="Cron Jobs"
              desc="Scheduled tasks"
              status={cronStatus.status}
            />
          </div>
        </div>
      </div>

      {/* Current User - Compact */}
      {user && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Current User</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><span className="text-gray-500">Email:</span> {user.primaryEmailAddress?.emailAddress}</span>
            <span><span className="text-gray-500">Name:</span> {user.firstName} {user.lastName}</span>
            <span><span className="text-gray-500">ID:</span> <code className="text-xs">{user.id}</code></span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Connected</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Not Configured</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Error</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Not Tested</span>
      </div>
    </div>
  )
}
