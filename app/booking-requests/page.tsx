import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BookingRequestsClient from '@/components/BookingRequestsClient'

export default async function BookingRequestsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch all booking requests for the user
  const bookingRequests = await prisma.bookingRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return <BookingRequestsClient bookingRequests={bookingRequests} />
}

