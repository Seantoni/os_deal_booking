'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { testOpenAIConnection } from '@/app/actions/openai'

export default function SystemTab() {
  const { user } = useUser()
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [dbError, setDbError] = useState<string | null>(null)
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle')
  const [openaiError, setOpenaiError] = useState<string | null>(null)
  const [openaiModel, setOpenaiModel] = useState<string | null>(null)
  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle')
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  const [firebaseProjectId, setFirebaseProjectId] = useState<string | null>(null)

  useEffect(() => {
    checkDatabaseStatus()
    checkFirebaseStatus()
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

  async function checkOpenAIStatus() {
    setOpenaiStatus('checking')
    setOpenaiError(null)
    try {
      const response = await testOpenAIConnection()
      if (response.success) {
        setOpenaiStatus('connected')
        setOpenaiModel(response.model || null)
      } else {
        setOpenaiStatus('error')
        setOpenaiError(response.error || 'Connection failed')
      }
    } catch (error) {
      setOpenaiStatus('error')
      setOpenaiError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async function checkFirebaseStatus() {
    setFirebaseStatus('checking')
    setFirebaseError(null)
    try {
      const response = await fetch('/api/health/firebase')
      const data = await response.json()
      if (data.connected) {
        setFirebaseStatus('connected')
        setFirebaseProjectId(data.details?.projectId || null)
      } else if (data.configured === false) {
        setFirebaseStatus('idle')
        setFirebaseError('Not configured')
      } else {
        setFirebaseStatus('error')
        setFirebaseError(data.error || 'Connection failed')
      }
    } catch (error) {
      setFirebaseStatus('error')
      setFirebaseError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Health Checks Card */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">System Health Checks</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor the status of all system connections and services</p>
        </div>

        <div className="space-y-4">
          {/* Clerk Authentication Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <div>
                <p className="font-semibold text-gray-900">Clerk Authentication</p>
                <p className="text-xs text-gray-600">User authentication service</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user ? '✓ Connected' : '✗ Not Connected'}
            </span>
          </div>

          {/* Database Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                dbStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                dbStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`}></div>
              <div>
                <p className="font-semibold text-gray-900">Database (Neon PostgreSQL)</p>
                <p className="text-xs text-gray-600">Primary data storage</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                dbStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                dbStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-100 text-red-800'
              }`}>
                {dbStatus === 'connected' ? '✓ Connected' : dbStatus === 'checking' ? '⟳ Checking...' : '✗ Error'}
              </span>
              {dbStatus !== 'checking' && (
                <button
                  onClick={checkDatabaseStatus}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Recheck
                </button>
              )}
            </div>
          </div>

          {dbError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800"><strong>Database Error:</strong> {dbError}</p>
            </div>
          )}

          {/* OpenAI API Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-white rounded-lg border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                openaiStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                openaiStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                openaiStatus === 'idle' ? 'bg-gray-400' :
                'bg-red-500'
              }`}></div>
              <div>
                <p className="font-semibold text-gray-900">OpenAI API</p>
                <p className="text-xs text-gray-600">PDF parsing & AI features</p>
                {openaiModel && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">Model: {openaiModel}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                openaiStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                openaiStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                openaiStatus === 'idle' ? 'bg-gray-100 text-gray-600' :
                'bg-red-100 text-red-800'
              }`}>
                {openaiStatus === 'connected' ? '✓ Connected' : 
                 openaiStatus === 'checking' ? '⟳ Checking...' : 
                 openaiStatus === 'idle' ? 'Not Tested' :
                 '✗ Error'}
              </span>
              <button
                onClick={checkOpenAIStatus}
                disabled={openaiStatus === 'checking'}
                className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
              >
                {openaiStatus === 'idle' ? 'Test' : 'Recheck'}
              </button>
            </div>
          </div>

          {openaiError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800"><strong>OpenAI Error:</strong> {openaiError}</p>
              <p className="text-xs text-red-600 mt-2">Make sure OPENAI_API_KEY is set in your .env file</p>
            </div>
          )}

          {/* Firebase Cloud Messaging Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-white rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                firebaseStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                firebaseStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                firebaseStatus === 'idle' ? 'bg-gray-400' :
                'bg-red-500'
              }`}></div>
              <div>
                <p className="font-semibold text-gray-900">Firebase Cloud Messaging</p>
                <p className="text-xs text-gray-600">Push notifications service</p>
                {firebaseProjectId && (
                  <p className="text-xs text-orange-700 font-medium mt-1">Project: {firebaseProjectId}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                firebaseStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                firebaseStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                firebaseStatus === 'idle' ? 'bg-gray-100 text-gray-600' :
                'bg-red-100 text-red-800'
              }`}>
                {firebaseStatus === 'connected' ? '✓ Connected' : 
                 firebaseStatus === 'checking' ? '⟳ Checking...' : 
                 firebaseStatus === 'idle' ? 'Not Configured' :
                 '✗ Error'}
              </span>
              <button
                onClick={checkFirebaseStatus}
                disabled={firebaseStatus === 'checking'}
                className="px-3 py-1 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-gray-400"
              >
                {firebaseStatus === 'idle' ? 'Test' : 'Recheck'}
              </button>
            </div>
          </div>

          {firebaseError && firebaseError !== 'Not configured' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800"><strong>Firebase Error:</strong> {firebaseError}</p>
              <p className="text-xs text-red-600 mt-2">Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your .env file</p>
            </div>
          )}

          {/* Resend Email Service Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-white rounded-lg border border-indigo-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                process.env.NEXT_PUBLIC_APP_URL ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <div>
                <p className="font-semibold text-gray-900">Resend Email Service</p>
                <p className="text-xs text-gray-600">Booking request notifications</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              process.env.NEXT_PUBLIC_APP_URL ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {process.env.NEXT_PUBLIC_APP_URL ? '✓ Configured' : 'Not Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      {user && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Current User</h2>
            <p className="text-sm text-gray-600 mt-1">Logged in user information</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Email:</span>
              <span className="text-gray-900">{user.primaryEmailAddress?.emailAddress || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Name:</span>
              <span className="text-gray-900">{user.firstName} {user.lastName}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">User ID:</span>
              <span className="text-gray-900 font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

