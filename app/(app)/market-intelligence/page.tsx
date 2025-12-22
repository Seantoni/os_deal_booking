import { getUserRole } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import MarketIntelligenceClient from './MarketIntelligenceClient'

export default async function MarketIntelligencePage() {
  const role = await getUserRole()
  
  // Only admins can access this page
  if (role !== 'admin') {
    redirect('/dashboard')
  }
  
  return <MarketIntelligenceClient />
}

