import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getEvents } from '@/app/actions/events'
import { getBookingRequests } from '@/app/actions/booking'
import { getUserRole } from '@/lib/auth/roles'
import { requirePageAccess } from '@/lib/auth/page-access'
import EventsPageClient from '@/components/events/EventsPageClient'
import PageContent from '@/components/common/PageContent'

export default async function EventsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/events')
  
  // Parallel server-side data fetching
  const [events, bookingRequestsResult, userRole] = await Promise.all([
    getEvents(),
    getBookingRequests(),
    getUserRole(),
  ])
  
  const bookingRequests = bookingRequestsResult.success ? bookingRequestsResult.data || [] : []

  return (
    <PageContent>
      {/* Full-height calendar layout without card wrapper */}
      <div className="h-full flex flex-col p-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Main Content - add bottom padding on mobile for nav */}
          <div className="flex-1 overflow-hidden pb-14 md:pb-0">
            <EventsPageClient 
              events={events} 
              bookingRequests={bookingRequests} 
              userRole={userRole} 
            />
          </div>
        </div>
      </div>
    </PageContent>
  )
}
