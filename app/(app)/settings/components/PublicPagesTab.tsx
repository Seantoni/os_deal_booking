import React from 'react'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LinkIcon from '@mui/icons-material/Link'

export default function PublicPagesTab() {
  const pages = [
    {
      title: 'Booking Request Approved',
      description: 'Page shown when a booking request is approved.',
      path: '/booking-request/approved',
      params: '?approvedBy=Demo User'
    },
    {
      title: 'Booking Request Already Processed',
      description: 'Page shown when trying to process a request that was already handled.',
      path: '/booking-request/already-processed',
      params: '?status=approved&id=demo-id'
    },
    {
      title: 'Booking Request Cancelled',
      description: 'Page shown when a booking request has been cancelled.',
      path: '/booking-request/cancelled',
      params: '?id=demo-id'
    },
    {
      title: 'Booking Request Confirmation',
      description: 'Confirmation page after submitting a booking request.',
      path: '/booking-request/confirmation',
      params: '?requestId=demo-id'
    },
    {
      title: 'Booking Request Rejected',
      description: 'Page shown when a booking request is rejected.',
      path: '/booking-request/rejected',
      params: '?success=true'
    },
    {
      title: 'Booking Request Error',
      description: 'Generic error page for booking requests.',
      path: '/booking-request/error',
      params: '?message=An example error message occurred'
    },
    {
      title: 'Booking Request Form Error',
      description: 'Error page specific to form validation or link issues.',
      path: '/booking-request/form-error',
      params: '?reason=invalid_link'
    },
    {
      title: 'No Access',
      description: 'Page shown when a user does not have permission to access the app.',
      path: '/no-access',
      params: ''
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Public Pages Preview</h2>
        <p className="text-sm text-gray-500 mb-6">
          Use the links below to preview the public-facing pages of the application. 
          These pages are accessible without authentication (except No Access page which checks current user).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((page) => (
            <div 
              key={page.path} 
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-gray-50/50 hover:bg-white group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <LinkIcon fontSize="small" className="text-gray-400 group-hover:text-blue-500" />
                  {page.title}
                </h3>
                <a 
                  href={`${page.path}${page.params}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                  title="Open in new tab"
                >
                  <OpenInNewIcon fontSize="small" />
                </a>
              </div>
              
              <p className="text-xs text-gray-500 mb-3 h-10">
                {page.description}
              </p>
              
              <div className="bg-gray-100 rounded px-2 py-1.5 text-xs font-mono text-gray-600 truncate flex items-center justify-between">
                <span className="truncate">{page.path}</span>
                {page.params && (
                  <span className="text-gray-400 ml-2 text-[10px] shrink-0">params</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

