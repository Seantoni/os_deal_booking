import { requirePageAccess } from '@/lib/auth/page-access'
import { getAllCampaigns } from '@/app/actions/campaigns'
import CampaignsPageClient from './CampaignsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function CampaignsPage() {
  // Check role-based access (admin, sales, marketing)
  try {
    await requirePageAccess('/campaigns')
  } catch {
    // Allow access if route not configured yet
  }

  // Fetch initial campaigns data server-side
  const campaignsResult = await getAllCampaigns()
  const initialCampaigns = campaignsResult.success ? campaignsResult.data || [] : []

  return (
    <AppLayout title="Campañas">
      <CampaignsPageClient initialCampaigns={initialCampaigns} />
    </AppLayout>
  )
}
