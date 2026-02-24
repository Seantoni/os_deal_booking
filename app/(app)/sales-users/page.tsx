import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/common/AppLayout'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getSalesUsersOverview } from '@/app/actions/sales-users'
import SalesUsersClient from './SalesUsersClient'

export const dynamic = 'force-dynamic'

export default async function SalesUsersPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  await requirePageAccess('/sales-users')

  const result = await getSalesUsersOverview()

  return (
    <AppLayout title="Usuarios de Ventas">
      <SalesUsersClient
        users={result.success && result.data ? result.data.users : []}
        windowLabel={result.success && result.data ? result.data.window : null}
        error={!result.success ? (result.error || 'No se pudo cargar la información') : null}
      />
    </AppLayout>
  )
}
