import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { getEvents } from '@/app/actions/events'
import EventForm from '@/components/EventForm'
import EventList from '@/components/EventList'

export default async function EventsPage() {
  const user = await currentUser()
  const events = await getEvents()

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Calendar Clone</h1>
          <UserButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Creation Form */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Event</h2>
            <EventForm />
          </div>

          {/* Events List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Events</h2>
            <EventList events={events} />
          </div>
        </div>
      </main>
    </div>
  )
}

