'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createEvent(formData: FormData) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  if (!name || !startDate || !endDate) {
    throw new Error('Missing required fields')
  }

  const event = await prisma.event.create({
    data: {
      name,
      description: description || null,
      category: category || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId,
    },
  })

  revalidatePath('/events')
  return event
}

export async function getEvents() {
  const { userId } = await auth()
  
  if (!userId) {
    return []
  }

  const events = await prisma.event.findMany({
    where: {
      userId,
    },
    orderBy: {
      startDate: 'asc',
    },
  })

  return events
}

export async function deleteEvent(eventId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  await prisma.event.delete({
    where: {
      id: eventId,
      userId, // Ensure user can only delete their own events
    },
  })

  revalidatePath('/events')
}

