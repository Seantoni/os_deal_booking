import { redirect } from 'next/navigation'
import { validatePublicLinkToken } from '@/app/actions/booking'
import { getSettingsFromDB } from '@/app/actions/settings'
import PublicBookingForm from '@/components/RequestForm/PublicBookingForm'
import { buildInitialFormDataFromPublicPrefill } from '@/lib/booking-requests/public-form-prefill'
import { DEFAULT_SETTINGS } from '@/lib/settings'

interface PublicBookingRequestPageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PublicBookingRequestPage({ params, searchParams }: PublicBookingRequestPageProps) {
  const { token } = await params
  const resolvedSearchParams = await searchParams

  // Validate the token
  const validation = await validatePublicLinkToken(token)

  if (!validation.valid || !validation.publicLink) {
    // Redirect to error page or show error message
    redirect(`/booking-request/form-error?reason=${encodeURIComponent(validation.error || 'invalid_link')}`)
  }

  if (validation.publicLink.isUsed) {
    redirect(`/booking-request/form-error?reason=${encodeURIComponent('link_already_used')}`)
  }

  const settingsResult = await getSettingsFromDB()
  const settings = settingsResult.success && settingsResult.data ? settingsResult.data : DEFAULT_SETTINGS
  const initialFormData = buildInitialFormDataFromPublicPrefill(resolvedSearchParams)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <PublicBookingForm
          token={token}
          initialFormData={initialFormData}
          settings={settings}
        />
      </div>
    </div>
  )
}
