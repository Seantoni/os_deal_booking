import { currentUser } from '@clerk/nextjs/server'
import { getEvents } from '@/app/actions/events'
import { getBookingRequests } from '@/app/actions/booking'
import { getUserRole } from '@/lib/auth/roles'
import { requirePageAccess } from '@/lib/auth/page-access'
import EventsPageClient from '@/components/events/EventsPageClient'
import EventsHeaderActions from '@/components/events/EventsHeaderActions'
import AppHeader from '@/components/common/AppHeader'
import HamburgerMenu from '@/components/common/HamburgerMenu'
import MobileBottomNav from '@/components/common/MobileBottomNav'
import { SidebarProvider } from '@/components/common/SidebarContext'

export default async function EventsPage() {
  // Check role-based access
  await requirePageAccess('/events')
  
  const user = await currentUser()
  const events = await getEvents()
  const bookingRequestsResult = await getBookingRequests()
  const bookingRequests = bookingRequestsResult.success ? bookingRequestsResult.data || [] : []
  const userRole = await getUserRole()

  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col bg-white">
        <AppHeader 
          title="Events"
          actions={<EventsHeaderActions userRole={userRole} />}
        />
        <HamburgerMenu />

        {/* Main Content - add bottom padding on mobile for nav */}
        <div className="flex-1 overflow-hidden pb-14 md:pb-0">
          <EventsPageClient events={events} bookingRequests={bookingRequests} userRole={userRole} />
        </div>
        
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  )
}
