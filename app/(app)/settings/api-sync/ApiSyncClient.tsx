'use client'

import { useState, useEffect } from 'react'

interface SyncResult {
  success: boolean
  message: string
  stats?: {
    fetched: number
    created: number
    updated: number
    snapshots: number
  }
  error?: string
  logId?: string
  durationMs?: number
}

interface Summary {
  totalDeals: number
  totalSnapshots: number
  lastSyncedAt: string | null
}

export default function ApiSyncClient() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [sinceDays, setSinceDays] = useState(360)
  const [fetchAll, setFetchAll] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)

  // Load summary on mount
  useEffect(() => {
    fetch('/api/deal-metrics/sync')
      .then(res => res.json())
      .then(data => {
        if (data.summary) {
          setSummary(data.summary)
        }
      })
      .catch(() => {})
  }, [result]) // Refresh after sync

  const handleSync = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/deal-metrics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDays, fetchAll }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Request failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Deal Metrics Sync</h1>
      
      {/* Database Summary */}
      {summary && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="font-medium text-gray-700 mb-2">Database Summary</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Deals:</span>
              <span className="ml-2 font-medium">{summary.totalDeals}</span>
            </div>
            <div>
              <span className="text-gray-500">Snapshots:</span>
              <span className="ml-2 font-medium">{summary.totalSnapshots}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Sync:</span>
              <span className="ml-2 font-medium">
                {summary.lastSyncedAt 
                  ? new Date(summary.lastSyncedAt).toLocaleString() 
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fetch deals updated in the last:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={sinceDays}
                onChange={(e) => setSinceDays(Number(e.target.value))}
                min={1}
                max={365}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="text-gray-600">days</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="fetchAll"
              checked={fetchAll}
              onChange={(e) => setFetchAll(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="fetchAll" className="text-sm text-gray-700">
              Fetch all pages
            </label>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Syncing...' : 'Sync Deal Metrics'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? '✓' : '✗'}
              </span>
              <span className="font-medium">{result.message}</span>
            </div>
            
            {result.durationMs && (
              <p className="text-sm text-gray-600">Duration: {result.durationMs}ms</p>
            )}
            
            {result.logId && (
              <p className="text-sm text-gray-600">Log ID: {result.logId}</p>
            )}

            {result.error && (
              <p className="text-sm text-red-600 mt-2">Error: {result.error}</p>
            )}

            {result.stats && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                <div className="bg-white rounded p-2">
                  <div className="text-gray-500">Fetched</div>
                  <div className="font-bold text-lg">{result.stats.fetched}</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-500">Created</div>
                  <div className="font-bold text-lg text-green-600">{result.stats.created}</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-500">Updated</div>
                  <div className="font-bold text-lg text-blue-600">{result.stats.updated}</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-500">Snapshots</div>
                  <div className="font-bold text-lg text-purple-600">{result.stats.snapshots}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Data stored in <code>deal_metrics</code> and <code>deal_metrics_snapshots</code> tables</li>
            <li>• Snapshots are created when values change (historical tracking)</li>
            <li>• API requests logged to <code>external_api_requests</code> table</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
