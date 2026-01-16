import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { isAdmin } from '@/lib/auth/roles'
import { getAssignmentsPaginated, getAssignmentsCounts } from '@/app/actions/assignments'
import { getAllUserProfiles } from '@/app/actions/users'
import AssignmentsPageClient from './AssignmentsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function AssignmentsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Only admins can access this page
  const adminCheck = await isAdmin()
  if (!adminCheck) {
    redirect('/businesses')
  }

  // Check role-based access (may return if route not configured)
  try {
    await requirePageAccess('/assignments')
  } catch {
    // Allow if admin even if route not in page-access config
  }

  // Parallel server-side data fetching
  const [assignmentsResult, countsResult, usersResult] = await Promise.all([
    getAssignmentsPaginated({ page: 0, pageSize: 50 }),
    getAssignmentsCounts(),
    getAllUserProfiles(), // For assigning to new owner
  ])

  const initialAssignments = assignmentsResult.success ? assignmentsResult.data || [] : []
  const initialTotal = assignmentsResult.success && 'total' in assignmentsResult 
    ? (assignmentsResult.total as number) || 0 
    : 0
  const initialCounts = countsResult.success ? countsResult.data : undefined
  const users = usersResult.success ? usersResult.data || [] : []

  return (
    <AppLayout title="Asignaciones">
      <AssignmentsPageClient 
        initialAssignments={initialAssignments}
        initialTotal={initialTotal}
        initialCounts={initialCounts}
        users={users}
      />
    </AppLayout>
  )
}
