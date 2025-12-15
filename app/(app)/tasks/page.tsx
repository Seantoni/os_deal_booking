import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import TasksPageClient from './TasksPageClient'
import AppLayout from '@/components/common/AppLayout'

export const metadata = {
  title: 'Tasks | OS Deals Booking',
}

export default async function TasksPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/tasks')

  return (
    <AppLayout title="Mis Tareas">
      <TasksPageClient />
    </AppLayout>
  )
}
