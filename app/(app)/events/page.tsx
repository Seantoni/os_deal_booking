import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getCalendarEventsInRange, getCalendarPendingRequestsCount } from '@/app/actions/events'
import { getUserRole } from '@/lib/auth/roles'
import { requirePageAccess } from '@/lib/auth/page-access'
import EventsPageClient from '@/components/events/EventsPageClient'
import PageContent from '@/components/common/PageContent'
import { formatDateForPanama, getDateComponentsInPanama } from '@/lib/date/timezone'

function getInitialCalendarRange() {
  const todayPanama = getDateComponentsInPanama(new Date())
  const monthStart = new Date(todayPanama.year, todayPanama.month - 1, 1)
  const monthEnd = new Date(todayPanama.year, todayPanama.month, 0)

  const bufferedStart = new Date(monthStart)
  bufferedStart.setDate(bufferedStart.getDate() - 7)

  const bufferedEnd = new Date(monthEnd)
  bufferedEnd.setDate(bufferedEnd.getDate() + 7)

  return {
    startDate: formatDateForPanama(bufferedStart),
    endDate: formatDateForPanama(bufferedEnd),
    view: 'month' as const,
  }
}

export default async function EventsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/events')

  const initialRange = getInitialCalendarRange()
  
  // Parallel server-side data fetching
  const [eventsResult, pendingCountResult, userRole] = await Promise.all([
    getCalendarEventsInRange(initialRange.startDate, initialRange.endDate),
    getCalendarPendingRequestsCount(),
    getUserRole(),
  ])
  
  const events = eventsResult.success ? eventsResult.data || [] : []
  const pendingCount = pendingCountResult.success ? pendingCountResult.data || 0 : 0

  return (
    <PageContent>
      {/* Full-height calendar layout without card wrapper */}
      <div className="h-full flex flex-col p-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Main Content - add bottom padding on mobile for nav */}
          <div className="flex-1 overflow-hidden pb-14 md:pb-0">
            <EventsPageClient 
              events={events} 
              initialRange={initialRange}
              initialPendingCount={pendingCount}
              userRole={userRole} 
            />
          </div>
        </div>
      </div>
    </PageContent>
  )
}
