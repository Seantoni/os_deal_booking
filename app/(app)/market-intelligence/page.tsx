import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import MarketIntelligenceClient from './MarketIntelligenceClient'
import AppLayout from '@/components/common/AppLayout'

export default async function MarketIntelligencePage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access (admin only)
  await requirePageAccess('/market-intelligence')

  return (
    <AppLayout title="Inteligencia de Mercado">
      <MarketIntelligenceClient />
    </AppLayout>
  )
}
