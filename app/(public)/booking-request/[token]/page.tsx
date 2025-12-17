import { redirect, notFound } from 'next/navigation'
import { validatePublicLinkToken } from '@/app/actions/booking'
import PublicBookingForm from '@/components/RequestForm/PublicBookingForm'

interface PublicBookingRequestPageProps {
  params: Promise<{ token: string }>
}

export default async function PublicBookingRequestPage({ params }: PublicBookingRequestPageProps) {
  const { token } = await params

  // Validate the token
  const validation = await validatePublicLinkToken(token)

  if (!validation.valid || !validation.publicLink) {
    // Redirect to error page or show error message
    redirect(`/booking-request/form-error?reason=${encodeURIComponent(validation.error || 'invalid_link')}`)
  }

  if (validation.publicLink.isUsed) {
    redirect(`/booking-request/form-error?reason=${encodeURIComponent('link_already_used')}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <PublicBookingForm token={token} />
      </div>
    </div>
  )
}

