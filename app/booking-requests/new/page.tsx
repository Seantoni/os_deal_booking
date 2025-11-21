import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import BookingRequestForm from '@/components/BookingRequestForm'

export default async function NewBookingRequestPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4">
      <BookingRequestForm />
    </div>
  )
}

