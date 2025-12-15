import { requirePageAccess } from '@/lib/auth/page-access'
import { getUserRole } from '@/lib/auth/roles'
import EnhancedBookingForm from '@/components/RequestForm/EnhancedBookingForm'
import AppLayout from '@/components/common/AppLayout'

export default async function NewBookingRequestPage() {
  // Check role-based access
  await requirePageAccess('/booking-requests/new')
  
  // Get user role
  const role = await getUserRole()

  return (
    <AppLayout title="New Booking Request">
      <EnhancedBookingForm />
    </AppLayout>
  )
}

