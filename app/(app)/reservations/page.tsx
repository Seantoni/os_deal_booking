import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getEvents } from '@/app/actions/events'
import { prisma } from '@/lib/prisma'
import ReservationsClient from '@/components/booking/ReservationsClient'
import AppLayout from '@/components/common/AppLayout'

export default async function ReservationsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/reservations')

  // Fetch all events (ReservationsClient filters for booked events)
  const events = await getEvents()

  // Fetch user profiles for all unique userIds in events
  const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))]
  const users = userIds.length > 0 
    ? await prisma.userProfile.findMany({
        where: { clerkId: { in: userIds } },
        select: { clerkId: true, name: true, email: true },
      })
    : []

  // Create a map for quick lookup
  const usersMap: Record<string, { name: string | null; email: string | null }> = {}
  users.forEach(u => {
    usersMap[u.clerkId] = { name: u.name, email: u.email }
  })

  return (
    <AppLayout title="Reservations List">
      <ReservationsClient events={events} usersMap={usersMap} />
    </AppLayout>
  )
}
