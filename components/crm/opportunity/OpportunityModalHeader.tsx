'use client'

import type { Business, Opportunity, OpportunityStage, UserData } from '@/types'
import OpportunityPipeline from './OpportunityPipeline'
import { OpportunityPipelineSkeleton } from './OpportunityModalSkeleton'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import WonStageBanner from './WonStageBanner'
import type { OpportunityActivitySummary } from './useOpportunityActivitySummary'

interface OpportunityModalHeaderProps {
  loadingData: boolean
  stage: OpportunityStage
  savingStage: boolean
  onStageChange: (stage: OpportunityStage) => void
  activitySummary: OpportunityActivitySummary
  opportunity?: Opportunity | null
  users: UserData[]
  responsibleId: string
  isAdmin: boolean
  isViewOnly: boolean
  onResponsibleChange: (responsibleId: string) => void
  startDateDisplayValue: string | Date | null
  closeDateDisplayValue: string | Date | null
  linkedBusiness?: Business | null
  onCreateRequest: () => void
}

export default function OpportunityModalHeader({
  loadingData,
  stage,
  savingStage,
  onStageChange,
  activitySummary,
  opportunity,
  users,
  responsibleId,
  isAdmin,
  isViewOnly,
  onResponsibleChange,
  startDateDisplayValue,
  closeDateDisplayValue,
  linkedBusiness,
  onCreateRequest,
}: OpportunityModalHeaderProps) {
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2">
        {loadingData ? (
          <OpportunityPipelineSkeleton />
        ) : (
          <OpportunityPipeline
            stage={stage}
            onStageChange={isViewOnly ? () => {} : onStageChange}
            saving={savingStage}
          />
        )}
      </div>

      {!loadingData && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 md:px-4 py-2 space-y-1.5">
          <div className="flex items-center gap-3 md:gap-5 text-xs overflow-x-auto no-scrollbar pb-0.5">
            {(activitySummary.nextTask || activitySummary.lastTask) && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tareas</span>
                {activitySummary.nextTask && (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-orange-600 whitespace-nowrap">
                      Próx: {new Date(activitySummary.nextTask.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                      activitySummary.nextTask.days <= 0 ? 'bg-red-100 text-red-700'
                        : activitySummary.nextTask.days <= 2 ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {activitySummary.nextTask.daysText}
                    </span>
                  </span>
                )}
                {activitySummary.lastTask && (
                  <span className="hidden md:flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      Últ: {new Date(activitySummary.lastTask.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                      {activitySummary.lastTask.daysText}
                    </span>
                  </span>
                )}
              </div>
            )}

            {(activitySummary.nextMeeting || activitySummary.lastMeeting) && (
              <div className="flex items-center gap-2 pl-3 md:pl-5 border-l border-gray-300 flex-shrink-0">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reuniones</span>
                {activitySummary.nextMeeting && (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-blue-600 whitespace-nowrap">
                      Próx: {new Date(activitySummary.nextMeeting.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                      activitySummary.nextMeeting.days <= 0 ? 'bg-red-100 text-red-700'
                        : activitySummary.nextMeeting.days <= 2 ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {activitySummary.nextMeeting.daysText}
                    </span>
                  </span>
                )}
                {activitySummary.lastMeeting && (
                  <span className="hidden md:flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      Últ: {new Date(activitySummary.lastMeeting.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                      {activitySummary.lastMeeting.daysText}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {opportunity?.createdAt && (
                <span className="text-gray-400 whitespace-nowrap">
                  Creado: {new Date(opportunity.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {startDateDisplayValue && (
                <span className="whitespace-nowrap">
                  Inicio: {new Date(startDateDisplayValue).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {closeDateDisplayValue && (
                <span className="whitespace-nowrap">
                  Cierre: {new Date(closeDateDisplayValue).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            <span className="text-gray-300 hidden sm:inline">|</span>

            {isViewOnly ? (
              <ReferenceInfoBar.UserDisplayItem
                label="Responsable"
                user={users.find((u) => u.clerkId === responsibleId) || null}
              />
            ) : (
              <ReferenceInfoBar.UserSelectItem
                label="Responsable *"
                userId={responsibleId}
                users={users}
                isAdmin={isAdmin}
                onChange={onResponsibleChange}
                placeholder="Seleccionar..."
              />
            )}
          </div>
        </div>
      )}

      {!loadingData && stage === 'won' && linkedBusiness && (
        <WonStageBanner
          opportunity={opportunity}
          business={linkedBusiness}
          hasRequest={!!opportunity?.hasRequest}
          onCreateRequest={onCreateRequest}
        />
      )}
    </>
  )
}
