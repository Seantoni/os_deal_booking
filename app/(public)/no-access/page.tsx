import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'

export default async function NoAccessPage() {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || 'Unknown'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Restricted
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          Your email address (<span className="font-medium text-gray-900">{email}</span>) does not have access to this application.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            If you believe this is an error, please contact your administrator to request access.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <SignOutButton>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Sign Out
            </button>
          </SignOutButton>

          {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
            <Link
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}?subject=Access Request&body=Hello,%0D%0A%0D%0AI would like to request access to the OS Deals Booking application.%0D%0A%0D%0AMy email: ${email}%0D%0A%0D%0AThank you.`}
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Contact Administrator
            </Link>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-6">
          OS Deals Booking - OfertaSimple
        </p>
      </div>
    </div>
  )
}
