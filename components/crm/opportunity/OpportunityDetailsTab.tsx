'use client'

import type { Business, BookingRequest, Opportunity, OpportunityStage } from '@/types'
import type { CategoryRecord } from '@/types'
import type { useDynamicForm } from '@/hooks/useDynamicForm'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import LinkedBusinessSection from './LinkedBusinessSection'
import LinkedRequestSection from './LinkedRequestSection'
import LostReasonSection from './LostReasonSection'
import { OpportunityDetailsSkeleton } from './OpportunityModalSkeleton'

type DynamicFormLike = ReturnType<typeof useDynamicForm>

interface UserOption {
  clerkId: string
  name: string | null
  email: string | null
}

interface OpportunityDetailsTabProps {
  isLoading: boolean
  loading: boolean
  isViewOnly: boolean
  dynamicForm: DynamicFormLike
  categoryOptions: CategoryRecord[]
  userOptions: UserOption[]
  allBusinesses: Business[]
  isEditMode: boolean
  opportunity?: Opportunity | null
  stage: OpportunityStage
  linkedBusiness: Business | null
  linkedBookingRequest: BookingRequest | null
  onEditBusiness: (business: Business) => void
  onViewLinkedRequest: () => void
  onOpenLostReasonEditor: () => void
}

export default function OpportunityDetailsTab({
  isLoading,
  loading,
  isViewOnly,
  dynamicForm,
  categoryOptions,
  userOptions,
  allBusinesses,
  isEditMode,
  opportunity,
  stage,
  linkedBusiness,
  linkedBookingRequest,
  onEditBusiness,
  onViewLinkedRequest,
  onOpenLostReasonEditor,
}: OpportunityDetailsTabProps) {
  if (isLoading) {
    return <OpportunityDetailsSkeleton />
  }

  return (
    <div className="p-3 space-y-3">
      {dynamicForm.initialized && dynamicForm.sections.map((section) => {
        const visibleFieldCount = section.fields.filter((f) => f.isVisible).length
        const shouldCollapse = !!section.isCollapsed || visibleFieldCount >= 10
        return (
          <DynamicFormSection
            key={section.id}
            section={section}
            values={dynamicForm.getAllValues()}
            onChange={dynamicForm.setValue}
            disabled={loading || isViewOnly}
            categories={categoryOptions}
            users={userOptions}
            businesses={allBusinesses}
            categoryDisplayMode="parentOnly"
            defaultExpanded={!shouldCollapse}
            collapsible={true}
            isEditMode={isEditMode}
            hiddenFieldTypes={['business-select']}
          />
        )
      })}

      {!dynamicForm.initialized && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-medium">Configuración del formulario no inicializada</p>
          <p className="text-xs mt-1">Vaya a Configuración → Constructor de Formularios para inicializar la configuración del formulario de oportunidad.</p>
        </div>
      )}

      {opportunity && stage === 'lost' && opportunity.lostReason && (
        <LostReasonSection
          lostReason={opportunity.lostReason}
          onEdit={onOpenLostReasonEditor}
        />
      )}

      {linkedBusiness && (
        <LinkedBusinessSection
          business={linkedBusiness}
          onEdit={onEditBusiness}
        />
      )}

      {linkedBookingRequest && (
        <LinkedRequestSection
          request={linkedBookingRequest}
          onView={onViewLinkedRequest}
        />
      )}
    </div>
  )
}
