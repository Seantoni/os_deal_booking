'use client'

import { ChatLoadingSkeleton } from '@/components/common/ChatLoadingSkeleton'

/**
 * Opportunity Form Modal Skeletons
 * 
 * Specific loading skeletons for each tab in the OpportunityFormModal
 * Mobile-responsive with reduced elements on smaller screens
 */

/**
 * Pipeline skeleton - matches OpportunityPipeline component
 */
export function OpportunityPipelineSkeleton() {
  const stages = ['Inicio', 'Reunión', 'Enviada', 'Aprobada', 'Won', 'Lost']
  
  return (
    <div className="bg-white border-b border-gray-200 px-2 md:px-4 py-2 md:py-3">
      {/* Mobile: horizontally scrollable, Desktop: flex */}
      <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto scrollbar-hide pb-1 -mb-1">
        {stages.map((_, i) => (
          <div key={i} className="flex items-center flex-shrink-0 md:flex-1">
            {/* Stage button skeleton */}
            <div 
              className="h-7 md:h-8 min-w-[60px] md:min-w-0 md:w-full flex items-center justify-center border border-gray-200 rounded bg-gray-50 animate-pulse" 
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center gap-1 px-1.5 md:px-2">
                {/* Check icon placeholder (only for past stages) */}
                {i < 2 && <div className="h-3 w-3 bg-gray-300 rounded"></div>}
                {/* Stage label */}
                <div className="h-2.5 md:h-3 bg-gray-300 rounded w-10 md:w-16"></div>
              </div>
            </div>
            {/* Divider between stages */}
            {i < stages.length - 1 && (
              <div className="w-0.5 md:w-1 h-0.5 bg-gray-200 flex-shrink-0"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Reference Info Bar skeleton - matches ReferenceInfoBar component
 */
export function ReferenceInfoBarSkeleton() {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 space-y-1.5">
      {/* Line 1: Action items (fewer on mobile) */}
      <div className="flex items-center gap-3 md:gap-5 overflow-x-auto scrollbar-hide">
        {[1, 2].map((_, i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="h-2.5 bg-gray-200 rounded w-12"></div>
            <div className="h-3 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-100 rounded px-1.5 w-10"></div>
          </div>
        ))}
      </div>
      {/* Line 2: Timeline + Owner */}
      <div className="flex items-center gap-3 md:gap-4 text-xs animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-2.5 bg-gray-200 rounded w-20"></div>
          <div className="h-2.5 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-3 bg-gray-300 rounded w-px"></div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 bg-gray-200 rounded w-16"></div>
          <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

/**
 * Details tab skeleton - includes reference bar and form sections (pipeline removed from initial load)
 */
export function OpportunityDetailsSkeleton() {
  return (
    <div className="bg-gray-50 h-full flex flex-col">
      {/* Reference bar skeleton */}
      <ReferenceInfoBarSkeleton />
      
      {/* Form sections skeleton */}
      <div className="p-2 md:p-3 space-y-2 md:space-y-3 flex-1 overflow-y-auto">
        {[1, 2].map((sectionIndex) => (
          <div
            key={sectionIndex}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse"
            style={{ animationDelay: `${sectionIndex * 0.1}s` }}
          >
            {/* Section header */}
            <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-2.5 border-b border-gray-200 flex items-center justify-between">
              <div className="h-3.5 md:h-4 bg-gray-200 rounded w-24 md:w-32"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </div>

            {/* Section fields - grid on desktop, stack on mobile */}
            <div className="p-3 md:p-4 space-y-2.5 md:space-y-3">
              {[1, 2].map((fieldIndex) => (
                <div key={fieldIndex} className="space-y-1">
                  <div className="h-2.5 md:h-3 bg-gray-200 rounded w-20 md:w-28"></div>
                  <div className="h-8 md:h-9 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Activity tab skeleton - matches TaskManager layout
 */
export function OpportunityActivitySkeleton() {
  return (
    <div className="p-3 md:p-6">
      {/* Header with "Nueva Tarea" button */}
      <div className="flex items-center justify-between mb-3 md:mb-4 animate-pulse">
        <div className="h-4 md:h-5 bg-gray-200 rounded w-24 md:w-32"></div>
        <div className="h-7 md:h-8 bg-blue-100 rounded w-24 md:w-28"></div>
      </div>

      {/* Task list skeleton - fewer items on mobile */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="bg-white border border-gray-200 rounded-lg p-2.5 md:p-3 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start gap-2 md:gap-3">
              {/* Checkbox */}
              <div className="h-4 w-4 md:h-5 md:w-5 bg-gray-200 rounded mt-0.5 border border-gray-300 flex-shrink-0"></div>
              
              {/* Task content */}
              <div className="flex-1 min-w-0 space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category badge */}
                  <div className={`h-4 md:h-5 bg-gray-200 rounded-full w-14 md:w-16 ${i === 1 ? 'bg-blue-100' : ''}`}></div>
                  {/* Date */}
                  <div className="h-3 md:h-4 bg-gray-200 rounded w-16 md:w-24"></div>
                </div>
                {/* Title */}
                <div className="h-3.5 md:h-4 bg-gray-200 rounded w-full md:w-3/4"></div>
              </div>
              
              {/* Actions - hidden on mobile */}
              <div className="hidden md:flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-100 rounded"></div>
                <div className="h-6 w-6 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Chat tab skeleton - uses ChatLoadingSkeleton component
 */
export function OpportunityChatSkeleton() {
  return (
    <div className="p-3 md:p-6 bg-white h-full flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 md:pb-3 mb-3 md:mb-4 animate-pulse">
        <div className="h-3.5 md:h-4 bg-gray-200 rounded w-24 md:w-32"></div>
        <div className="h-5 w-5 md:h-6 md:w-6 bg-gray-200 rounded"></div>
      </div>
      
      {/* Chat messages skeleton */}
      <div className="flex-1 overflow-y-auto pr-1 md:pr-2">
        <ChatLoadingSkeleton variant="default" messageCount={2} />
      </div>
      
      {/* Input skeleton */}
      <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 animate-pulse">
        <div className="h-16 md:h-20 bg-gray-100 rounded-lg"></div>
      </div>
    </div>
  )
}

/**
 * Full modal skeleton - shows when modal is first opening
 */
export function OpportunityModalFullSkeleton() {
  return (
    <div className="bg-gray-50 h-full flex flex-col">
      {/* Tabs skeleton */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex px-2 md:px-4 pt-2 -mb-px overflow-x-auto scrollbar-hide">
          {['Detalles', 'Actividad', 'Chat', 'Histórico'].map((_, i) => (
            <div 
              key={i} 
              className="px-3 md:px-4 py-2 md:py-2.5 animate-pulse flex-shrink-0" 
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`h-3.5 md:h-4 rounded w-14 md:w-16 ${i === 0 ? 'bg-gray-300' : 'bg-gray-200'}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton - default to details */}
      <OpportunityDetailsSkeleton />
    </div>
  )
}

