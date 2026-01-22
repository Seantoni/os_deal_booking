'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import BusinessIcon from '@mui/icons-material/Business'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LanguageIcon from '@mui/icons-material/Language'
import InstagramIcon from '@mui/icons-material/Instagram'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PersonIcon from '@mui/icons-material/Person'
import StoreIcon from '@mui/icons-material/Store'
import EditIcon from '@mui/icons-material/Edit'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import DescriptionIcon from '@mui/icons-material/Description'
import { Button, Input } from '@/components/ui'

// Lazy load heavy modal components
const BusinessFormModal = dynamic(() => import('@/components/crm/business/BusinessFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})
const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})
const BookingRequestViewModal = dynamic(() => import('@/components/booking/request-view/BookingRequestViewModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})
import OpportunitiesSection from '@/components/crm/business/OpportunitiesSection'
import RequestsSection from '@/components/crm/business/RequestsSection'
import DealMetricsSection from '@/components/crm/business/DealMetricsSection'
import { getOpportunitiesByBusiness } from '@/app/actions/crm'
import { getRequestsByBusiness } from '@/app/actions/booking-requests'
import type { Business, Opportunity, BookingRequest } from '@/types'

function InfoRow({ label, value, icon, isLink, href }: { label: string; value?: string | null; icon?: React.ReactNode; isLink?: boolean; href?: string }) {
  if (!value && value !== '0') return null

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
      {icon && <div className="text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0 bg-slate-50 p-1.5 rounded-md group-hover:bg-blue-50">{icon}</div>}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</span>
        {isLink && href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium break-all leading-snug hover:underline decoration-blue-300 underline-offset-2">
            {value}
          </a>
        ) : (
          <span className="text-sm text-slate-700 font-medium break-words leading-snug">{value}</span>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : !!children
  if (!hasContent) return null

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2.5">
        {icon && <div className="text-slate-400">{icon}</div>}
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-1 gap-0.5">
          {children}
        </div>
      </div>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${className}`}>
      {children}
    </span>
  )
}

interface BusinessDetailClientProps {
  business: Business
}

export default function BusinessDetailClient({ business: initialBusiness }: BusinessDetailClientProps) {
  const router = useRouter()
  const [business, setBusiness] = useState<Business>(initialBusiness)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false)
  const [requestViewModalOpen, setRequestViewModalOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [activeTab, setActiveTab] = useState<'pipeline' | 'metrics' | 'details'>('pipeline')

  const handleEditSuccess = (updatedBusiness: Business) => {
    setBusiness(updatedBusiness)
    setIsEditModalOpen(false)
    // Refresh the page data
    router.refresh()
  }

  // Load opportunities and requests
  useEffect(() => {
    async function loadData() {
      setLoadingData(true)
      try {
        const [oppResult, reqResult] = await Promise.all([
          getOpportunitiesByBusiness(business.id),
          getRequestsByBusiness(business.id),
        ])
        if (oppResult.success && oppResult.data) {
          setOpportunities(oppResult.data)
        }
        if (reqResult.success && reqResult.data) {
          setRequests(reqResult.data)
        }
      } catch (error) {
        console.error('Error loading opportunities/requests:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [business.id])

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity)
    setIsOpportunityModalOpen(true)
  }

  const handleCreateNewOpportunity = () => {
    setSelectedOpportunity(null)
    setIsOpportunityModalOpen(true)
  }

  const handleCreateRequest = () => {
    // Build query parameters with business data (matching OpportunityFormModal behavior)
    const params = new URLSearchParams()
    
    // Flag to trigger pre-fill logic in EnhancedBookingForm
    params.set('fromOpportunity', 'business')
    
    // Basic business info
    params.set('businessName', business.name)
    params.set('businessEmail', business.contactEmail)
    params.set('contactName', business.contactName || '')
    params.set('contactPhone', business.contactPhone || '')
    
    // Category info
    if (business.category) {
      params.set('categoryId', business.category.id)
      params.set('parentCategory', business.category.parentCategory)
      if (business.category.subCategory1) params.set('subCategory1', business.category.subCategory1)
      if (business.category.subCategory2) params.set('subCategory2', business.category.subCategory2)
    }
    
    // Legal/Tax info
    if (business.razonSocial) params.set('legalName', business.razonSocial)
    if (business.ruc) params.set('ruc', business.ruc)
    
    // Location info
    if (business.province) params.set('province', business.province)
    if (business.district) params.set('district', business.district)
    if (business.corregimiento) params.set('corregimiento', business.corregimiento)
    if (business.address) params.set('address', business.address)
    if (business.neighborhood) params.set('neighborhood', business.neighborhood)
    
    // Bank/Payment info
    if (business.bank) params.set('bank', business.bank)
    if (business.beneficiaryName) params.set('bankAccountName', business.beneficiaryName)
    if (business.accountNumber) params.set('accountNumber', business.accountNumber)
    if (business.accountType) params.set('accountType', business.accountType)
    if (business.paymentPlan) params.set('paymentPlan', business.paymentPlan)
    
    // Additional info
    if (business.description) params.set('description', business.description)
    if (business.website) params.set('website', business.website)
    if (business.instagram) params.set('instagram', business.instagram)
    
    // Payment contact emails
    if (business.emailPaymentContacts) {
      const paymentEmails = business.emailPaymentContacts.split(/[;,\s]+/).filter(Boolean)
      if (paymentEmails.length > 0) {
        params.set('paymentEmails', JSON.stringify(paymentEmails))
      }
    }
    
    router.push(`/booking-requests/new?${params.toString()}`)
  }

  const handleViewRequest = (request: BookingRequest) => {
    setSelectedRequestId(request.id)
    setRequestViewModalOpen(true)
  }

  const handleOpportunitySuccess = async (opportunity: Opportunity) => {
    setIsOpportunityModalOpen(false)
    setSelectedOpportunity(null)
    // Reload opportunities
    const result = await getOpportunitiesByBusiness(business.id)
    if (result.success && result.data) {
      setOpportunities(result.data)
    }
    // Reload requests in case a new one was created
    const reqResult = await getRequestsByBusiness(business.id)
    if (reqResult.success && reqResult.data) {
      setRequests(reqResult.data)
    }
  }

  // Helper to check if a section has any matching fields
  const matchesSearch = (value?: string | null, label?: string) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      (value && value.toLowerCase().includes(query)) ||
      (label && label.toLowerCase().includes(query))
    )
  }

  // Helper to render field if it matches search
  const renderField = (label: string, value?: string | null, props?: any) => {
    if (!matchesSearch(value, label)) return null
    return <InfoRow label={label} value={value} {...props} />
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      {/* Header Card - Compact */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <StoreIcon style={{ fontSize: 20 }} />
          </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold text-slate-900 truncate">{business.name}</h1>
                {business.tier && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded">
                    T{business.tier}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                  business.sourceType === 'api' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {business.sourceType === 'api' ? 'API' : 'Manual'}
                </span>
                {business.metrics?.net_rev_360_days !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-emerald-100 text-emerald-700 rounded">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(business.metrics.net_rev_360_days)}
                  </span>
                )}
              </div>
              {business.category && (
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <span className="truncate">{business.category.parentCategory}</span>
                    {business.category.subCategory1 && (
                      <>
                      <span className="text-slate-300">›</span>
                      <span className="truncate">{business.category.subCategory1}</span>
                      </>
                    )}
                </div>
              )}
          </div>
        </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
          {activeTab === 'details' && (
              <div className="hidden sm:block w-40">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  leftIcon={<SearchIcon style={{ fontSize: 14 }} />}
                size="sm"
              />
            </div>
          )}
          <Button
            onClick={() => setIsOpportunityModalOpen(true)}
              size="xs"
              className="bg-blue-600 hover:bg-blue-700 text-white"
          >
              <AddIcon style={{ fontSize: 14 }} />
              <span className="hidden sm:inline ml-1">Opportunity</span>
          </Button>
          <Button
            onClick={handleCreateRequest}
              size="xs"
              className="bg-green-600 hover:bg-green-700 text-white"
          >
              <DescriptionIcon style={{ fontSize: 14 }} />
              <span className="hidden sm:inline ml-1">Request</span>
          </Button>
          <Button
            onClick={() => setIsEditModalOpen(true)}
            variant="secondary"
              size="xs"
          >
              <EditIcon style={{ fontSize: 14 }} />
              <span className="hidden sm:inline ml-1">Edit</span>
          </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Compact */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === 'pipeline'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === 'metrics'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === 'details'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Details
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OpportunitiesSection
              opportunities={opportunities}
              onEditOpportunity={handleEditOpportunity}
              onCreateNew={handleCreateNewOpportunity}
              businessName={business.name}
            />

            <RequestsSection
              requests={requests}
              onViewRequest={handleViewRequest}
              businessName={business.name}
            />
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <DealMetricsSection
            vendorId={business.osAdminVendorId}
            businessName={business.name}
          />
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Section title="Contact Information" icon={<PhoneIcon fontSize="small" />}>
                {renderField("Contact Name", business.contactName, { icon: <PersonIcon fontSize="small" /> })}
                {renderField("Contact Email", business.contactEmail, { icon: <EmailIcon fontSize="small" />, isLink: true, href: `mailto:${business.contactEmail}` })}
                {renderField("Contact Phone", business.contactPhone, { icon: <PhoneIcon fontSize="small" />, isLink: true, href: `tel:${business.contactPhone}` })}
                {renderField("Website", business.website, { icon: <LanguageIcon fontSize="small" />, isLink: true, href: business.website })}
                {renderField("Instagram", business.instagram, { icon: <InstagramIcon fontSize="small" />, isLink: true, href: `https://instagram.com/${business.instagram?.replace('@', '')}` })}
              </Section>

              <Section title="Location" icon={<LocationOnIcon fontSize="small" />}>
                {renderField("Province", business.province)}
                {renderField("District", business.district)}
                {renderField("Corregimiento", business.corregimiento)}
                {renderField("Address", business.address)}
                {renderField("Neighborhood", business.neighborhood)}
              </Section>
            
              <Section title="Basic Information" icon={<BusinessIcon fontSize="small" />}>
                {renderField("Description", business.description)}
              </Section>
            </div>

            <div className="space-y-4">
              <Section title="Assignments & Relationships" icon={<PersonIcon fontSize="small" />}>
                {renderField("Owner", business.owner?.name || business.owner?.email || business.ownerId)}
                {renderField("Sales Reps", business.salesReps && business.salesReps.length > 0 ? business.salesReps.map((rep) => rep.salesRep?.name || rep.salesRep?.email || 'Rep').join(', ') : null)}
                {renderField("Source", business.sourceType)}
              </Section>

              <Section title="Business Profile & Legal" icon={<AccountBalanceIcon fontSize="small" />}>
                {renderField("RUC", business.ruc)}
                {renderField("Razón Social", business.razonSocial)}
                {renderField("Account Manager", business.accountManager)}
                {renderField("ERE", business.ere)}
                {renderField("Sales Type", business.salesType)}
                {renderField("IS Asesor", business.isAsesor)}
                {renderField("OS Asesor", business.osAsesor)}
              </Section>

              <Section title="Banking & Payments" icon={<AccountBalanceIcon fontSize="small" />}>
                {renderField("Payment Plan", business.paymentPlan)}
                {renderField("Bank", business.bank)}
                {renderField("Beneficiary Name", business.beneficiaryName)}
                {renderField("Account Number", business.accountNumber)}
                {renderField("Account Type", business.accountType)}
                {renderField("Payment Contacts", business.emailPaymentContacts)}
              </Section>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <BusinessFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        business={business}
        onSuccess={handleEditSuccess}
      />

      {/* Opportunity Modal */}
      <OpportunityFormModal
        isOpen={isOpportunityModalOpen}
        onClose={() => {
          setIsOpportunityModalOpen(false)
          setSelectedOpportunity(null)
        }}
        opportunity={selectedOpportunity}
        onSuccess={handleOpportunitySuccess}
        initialBusinessId={business.id}
        preloadedBusinesses={[business]}
      />

      {/* Request View Modal */}
      <BookingRequestViewModal
        isOpen={requestViewModalOpen}
        onClose={() => {
          setRequestViewModalOpen(false)
          setSelectedRequestId(null)
        }}
        requestId={selectedRequestId}
        hideBackdrop={false}
      />
    </div>
  )
}
