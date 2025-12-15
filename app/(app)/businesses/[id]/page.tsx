import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import AppLayout from '@/components/common/AppLayout'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBusiness } from '@/app/actions/crm'
import BusinessIcon from '@mui/icons-material/Business'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Button } from '@/components/ui'
import Link from 'next/link'
import BusinessDetailClient from './BusinessDetailClient'

// Ensure this route stays dynamic (no static rendering)
export const dynamic = 'force-dynamic'

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  await requirePageAccess('/businesses')

  // Await params (Next.js 15+ requirement)
  const { id } = await params

  // Guard against missing/invalid id
  if (!id) {
    notFound()
  }

  const result = await getBusiness(id)

  // Handle unauthorized (should rarely happen since we already checked auth)
  if (!result.success && result.error === 'Unauthorized') {
    redirect('/sign-in')
  }

  if (!result.success || !result.data) {
    // Instead of 404, show a friendly error state
    return (
      <AppLayout title="Business not found">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BusinessIcon className="text-gray-400" style={{ fontSize: 32 }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Business not found</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We couldn&apos;t find a business with ID <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">{id}</span>. It may have been deleted or the link is incorrect.
            </p>
            <Link href="/businesses">
              <Button leftIcon={<ArrowBackIcon />}>Back to Businesses</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const business = result.data

  // Header Actions
  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/businesses">
        <Button variant="outline" size="sm" leftIcon={<ArrowBackIcon />}>
          Back
        </Button>
      </Link>
    </div>
  )

  return (
    <AppLayout title={business.name || 'Business'} actions={headerActions}>
      <BusinessDetailClient business={business} />
    </AppLayout>
  )
}
