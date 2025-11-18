'use client'

import { useState } from 'react'
import { testOpenAIConnection } from '@/app/actions/openai'

export default function TestOpenAIPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; model?: string } | null>(null)

  async function handleTest() {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await testOpenAIConnection()
      setResult(response)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">OpenAI API Test</h1>
        
        <p className="text-gray-600 mb-6">
          Click the button below to test the OpenAI API connection.
        </p>

        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Testing...' : 'Test OpenAI Connection'}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-md ${
            result.success 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <h2 className={`font-semibold mb-2 ${
              result.success ? 'text-emerald-800' : 'text-red-800'
            }`}>
              {result.success ? '✅ Connection Successful!' : '❌ Connection Failed'}
            </h2>
            
            {result.success ? (
              <div className="text-emerald-700 text-sm space-y-1">
                <p><strong>Response:</strong> {result.message}</p>
                {result.model && <p><strong>Model:</strong> {result.model}</p>}
              </div>
            ) : (
              <div className="text-red-700 text-sm">
                <p><strong>Error:</strong> {result.error}</p>
                <p className="mt-2 text-xs">
                  Make sure you have added <code className="bg-red-100 px-1 rounded">OPENAI_API_KEY</code> to your <code className="bg-red-100 px-1 rounded">.env</code> file.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> Add your OpenAI API key to <code className="bg-gray-100 px-1 rounded">.env</code> as <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY=sk-...</code>
          </p>
        </div>
      </div>
    </div>
  )
}

