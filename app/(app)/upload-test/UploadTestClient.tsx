'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function UploadTestClient() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [uploadedKey, setUploadedKey] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [folder, setFolder] = useState('test-uploads')
  const [makePublic, setMakePublic] = useState(true)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadedUrl(null)
      setUploadedKey(null)

      // Create preview URL
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      formData.append('makePublic', makePublic.toString())

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadedUrl(result.url)
      setUploadedKey(result.key)
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Clear all
  const handleClear = () => {
    setFile(null)
    setUploadedUrl(null)
    setUploadedKey(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    const input = document.getElementById('file-input') as HTMLInputElement
    if (input) input.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">S3 Image Upload Test</h1>
        <p className="text-sm text-gray-600 mt-1">
          Test uploading images to Amazon S3
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Upload Configuration</h2>

        {/* Folder Input */}
        <div>
          <label htmlFor="folder" className="block text-sm font-medium text-gray-700 mb-1">
            Folder (S3 prefix)
          </label>
          <input
            id="folder"
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="uploads"
          />
        </div>

        {/* Public Access Toggle */}
        <div className="flex items-center gap-2">
          <input
            id="makePublic"
            type="checkbox"
            checked={makePublic}
            onChange={(e) => setMakePublic(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="makePublic" className="text-sm font-medium text-gray-700">
            Make file publicly accessible
          </label>
        </div>

        {/* File Input */}
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-1">
            Select Image File
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-1 text-sm text-gray-500">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Preview */}
        {previewUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preview
            </label>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-64 mx-auto rounded"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>
          <button
            onClick={handleClear}
            disabled={uploading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadedUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-green-900">✅ Upload Successful!</h2>

          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-green-800 mb-1">
                S3 URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={uploadedUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(uploadedUrl)
                    toast.success('URL copied to clipboard!')
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-green-800 mb-1">
                S3 Key
              </label>
              <input
                type="text"
                value={uploadedKey || ''}
                readOnly
                className="w-full px-3 py-2 bg-white border border-green-300 rounded-md text-sm font-mono"
              />
            </div>

            {/* Display uploaded image */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-green-800 mb-1">
                Uploaded Image
              </label>
              <div className="border border-green-200 rounded-md p-4 bg-white">
                <img
                  src={uploadedUrl}
                  alt="Uploaded"
                  className="max-w-full max-h-96 mx-auto rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+'
                    toast.error('Failed to load uploaded image. Check if the file is public or S3 bucket configuration.')
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

