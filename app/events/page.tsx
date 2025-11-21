import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { getEvents } from '@/app/actions/events'
import { getBookingRequests } from '@/app/actions/booking-requests'
import { getUserRole } from '@/lib/roles'
import EventsPageClient from '@/components/EventsPageClient'
import EventsHeaderActions from '@/components/EventsHeaderActions'

export default async function EventsPage() {
  const user = await currentUser()
  const events = await getEvents()
  const bookingRequestsResult = await getBookingRequests()
  const bookingRequests = bookingRequestsResult.success ? bookingRequestsResult.data || [] : []
  const userRole = await getUserRole()

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex-shrink-0 pl-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">OS Deals Booking</h1>
            <EventsHeaderActions userRole={userRole} />
          </div>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <EventsPageClient events={events} bookingRequests={bookingRequests} userRole={userRole} />
      </div>
    </div>
  )
}

