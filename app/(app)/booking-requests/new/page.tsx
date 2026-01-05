import { requirePageAccess } from '@/lib/auth/page-access'
import EnhancedBookingForm from '@/components/RequestForm/EnhancedBookingForm'
import PageContent from '@/components/common/PageContent'

export default async function NewBookingRequestPage() {
  // Check role-based access
  await requirePageAccess('/booking-requests/new')

  // Don't use AppLayout here - the form has its own full-page layout
  // Just use PageContent for sidebar margin handling
  return (
    <PageContent>
      <EnhancedBookingForm />
    </PageContent>
  )
}
