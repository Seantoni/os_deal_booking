import { getEvents } from '@/app/actions/events'
import ReservationsClient from '@/components/ReservationsClient'

export default async function ReservationsPage() {
  const events = await getEvents()

  return <ReservationsClient events={events} />
}

