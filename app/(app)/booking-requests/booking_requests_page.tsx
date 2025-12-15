import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBookingRequests } from '@/app/actions/booking'
import BookingRequestsClient from '@/components/booking/BookingRequestsClient'
import AppLayout from '@/components/common/AppLayout'

export default async function BookingRequestsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/booking-requests')

  // Fetch all booking requests using cached action
  const bookingRequestsResult = await getBookingRequests()
  const bookingRequests = bookingRequestsResult.success ? bookingRequestsResult.data || [] : []

  return (
    <AppLayout title="Booking Requests">
      <BookingRequestsClient bookingRequests={bookingRequests} />
    </AppLayout>
  )
}

