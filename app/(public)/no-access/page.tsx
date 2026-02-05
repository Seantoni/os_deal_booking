import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'
import { PublicPageLayout } from '@/components/shared/public-pages/PublicPageLayout'

export default async function NoAccessPage() {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || 'Unknown'

  return (
    <PublicPageLayout title="Access Restricted">
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#ff9500] shadow-lg shadow-orange-500/20 mb-6">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Message */}
        <p className="text-[#86868b] mb-6 leading-relaxed">
          Your email address (<span className="font-medium text-[#1d1d1f]">{email}</span>) does not have access to this application.
        </p>

        <div className="bg-[#f5f5f7] rounded-xl p-4 mb-8 text-left">
          <p className="text-sm text-[#86868b]">
            If you believe this is an error, please contact your administrator to request access.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <SignOutButton>
            <button className="w-full bg-[#e84c0f] hover:bg-[#c2410c] text-white font-semibold py-3 px-4 rounded-full transition-colors text-sm">
              Sign Out
            </button>
          </SignOutButton>

          {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
            <Link
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}?subject=Access Request&body=Hello,%0D%0A%0D%0AI would like to request access to the OS Deals Booking application.%0D%0A%0D%0AMy email: ${email}%0D%0A%0D%0AThank you.`}
              className="block w-full bg-[#f5f5f7] hover:bg-[#e5e5e5] text-[#1d1d1f] font-semibold py-3 px-4 rounded-full transition-colors text-sm"
            >
              Contact Administrator
            </Link>
          )}
        </div>
      </div>
    </PublicPageLayout>
  )
}
