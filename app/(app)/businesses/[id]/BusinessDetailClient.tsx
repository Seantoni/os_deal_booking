'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Button, Input } from '@/components/ui'
import BusinessFormModal from '@/components/crm/business/BusinessFormModal'
import OpportunityFormModal from '@/components/crm/opportunity/OpportunityFormModal'
import type { Business, Opportunity } from '@/types'

function InfoRow({ label, value, icon, isLink, href }: { label: string; value?: string | null; icon?: React.ReactNode; isLink?: boolean; href?: string }) {
  if (!value && value !== '0') return null

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors group">
      {icon && <div className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0">{icon}</div>}
      <div className="flex items-baseline gap-2 flex-1 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex-shrink-0">{label}:</span>
        {isLink && href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-600 hover:underline font-medium break-all leading-tight truncate">
            {value}
          </a>
        ) : (
          <span className="text-[13px] text-gray-900 break-words leading-tight">{value}</span>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : !!children
  if (!hasContent) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-200 flex items-center gap-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-1 gap-1">
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

  const handleEditSuccess = (updatedBusiness: Business) => {
    setBusiness(updatedBusiness)
    setIsEditModalOpen(false)
    // Refresh the page data
    router.refresh()
  }

  const handleOpportunitySuccess = (opportunity: Opportunity) => {
    setIsOpportunityModalOpen(false)
    // Navigate to opportunities page with the new opportunity
    router.push('/opportunities')
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
      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 md:items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <StoreIcon style={{ fontSize: 32 }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
              {business.tier && (
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                  Tier {business.tier}
                </Badge>
              )}
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                {business.sourceType === 'api' ? 'Synced (API)' : 'Manual'}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-600 mt-2">
              {business.category && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900">Category:</span>
                  <span>
                    {business.category.parentCategory}
                    {business.category.subCategory1 && <span className="text-gray-400 mx-1">›</span>}
                    {business.category.subCategory1}
                  </span>
                </div>
              )}
              {business.metrics?.net_rev_360_days !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900">Net Rev (360d):</span>
                  <span className="font-mono text-green-700 font-semibold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(business.metrics.net_rev_360_days)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search details..."
              leftIcon={<SearchIcon className="w-4 h-4 text-gray-400" />}
              className="text-sm"
              size="sm"
            />
          </div>
          <Button
            onClick={() => setIsOpportunityModalOpen(true)}
            size="sm"
            leftIcon={<AddIcon fontSize="small" />}
          >
            Nueva oportunidad
          </Button>
          <Button
            onClick={() => setIsEditModalOpen(true)}
            variant="secondary"
            size="sm"
            leftIcon={<EditIcon fontSize="small" />}
          >
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
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

        {/* Right Column */}
        <div className="space-y-4">
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

          <Section title="Assignments & Relationships" icon={<PersonIcon fontSize="small" />}>
            {renderField("Owner", business.owner?.name || business.owner?.email || business.ownerId)}
            {renderField("Sales Reps", business.salesReps && business.salesReps.length > 0 ? business.salesReps.map((rep) => rep.salesRep?.name || rep.salesRep?.email || 'Rep').join(', ') : null)}
            {renderField("Source", business.sourceType)}
          </Section>
        </div>
      </div>

      {/* Edit Modal */}
      <BusinessFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        business={business}
        onSuccess={handleEditSuccess}
      />

      {/* New Opportunity Modal */}
      <OpportunityFormModal
        isOpen={isOpportunityModalOpen}
        onClose={() => setIsOpportunityModalOpen(false)}
        opportunity={null}
        onSuccess={handleOpportunitySuccess}
        initialBusinessId={business.id}
      />
    </div>
  )
}
