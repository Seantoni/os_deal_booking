import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { getEvents } from '@/app/actions/events'
import EventsPageClient from '@/components/EventsPageClient'

export default async function EventsPage() {
  const user = await currentUser()
  const events = await getEvents()

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Calendar Clone</h1>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <EventsPageClient events={events} />
      </div>
    </div>
  )
}

