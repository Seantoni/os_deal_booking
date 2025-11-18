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
  const merchant = formData.get('merchant') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  if (!name || !startDate || !endDate) {
    throw new Error('Missing required fields')
  }

  // Parse dates - split and create as UTC midnight to avoid timezone shifts
  const [createStartY, createStartM, createStartD] = startDate.split('-').map(Number)
  const [createEndY, createEndM, createEndD] = endDate.split('-').map(Number)
  
  const startDateTime = new Date(Date.UTC(createStartY, createStartM - 1, createStartD, 0, 0, 0))
  const endDateTime = new Date(Date.UTC(createEndY, createEndM - 1, createEndD, 0, 0, 0))

  const event = await prisma.event.create({
    data: {
      name,
      description: description || null,
      category: category || null,
      merchant: merchant || null,
      startDate: startDateTime,
      endDate: endDateTime,
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

export async function updateEvent(eventId: string, formData: FormData) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const merchant = formData.get('merchant') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  if (!name || !startDate || !endDate) {
    throw new Error('Missing required fields')
  }

  // Parse dates - split and create as UTC to avoid any timezone conversion
  const [startY, startM, startD] = startDate.split('-').map(Number)
  const [endY, endM, endD] = endDate.split('-').map(Number)
  
  const startDateTime = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0))
  const endDateTime = new Date(Date.UTC(endY, endM - 1, endD, 0, 0, 0))

  const event = await prisma.event.update({
    where: {
      id: eventId,
      userId, // Ensure user can only update their own events
    },
    data: {
      name,
      description: description || null,
      category: category || null,
      merchant: merchant || null,
      startDate: startDateTime,
      endDate: endDateTime,
    },
  })

  revalidatePath('/events')
  return event
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

