'use client'

import { ChatLoadingSkeleton } from '@/components/common/ChatLoadingSkeleton'

/**
 * Opportunity Form Modal Skeletons
 * 
 * Specific loading skeletons for each tab in the OpportunityFormModal
 */

/**
 * Pipeline skeleton - matches OpportunityPipeline component
 */
export function OpportunityPipelineSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between gap-4 overflow-x-auto">
        {['Iniciación', 'Reunión', 'Propuesta', 'Won', 'Lost'].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[100px] flex-1">
            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div 
                className={`h-full rounded-full animate-pulse ${i === 0 ? 'bg-orange-300' : 'bg-gray-200'}`}
                style={{ 
                  width: i === 0 ? '100%' : i === 1 ? '0%' : '0%',
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            </div>
            {/* Stage circle */}
            <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center ${
              i === 0 ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-white'
            } animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`h-4 w-4 rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
            </div>
            {/* Stage label */}
            <div className={`h-3.5 bg-gray-200 rounded w-16 animate-pulse`} style={{ animationDelay: `${i * 0.15}s` }}></div>
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
  const items = [
    { icon: true, label: true, value: true },
    { icon: true, label: true, value: true },
    { icon: true, label: true, value: true },
    { icon: true, label: true, value: true },
    { icon: true, label: true, value: true },
  ]
  
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
            {item.icon && <div className="h-3.5 w-3.5 bg-gray-200 rounded"></div>}
            {item.label && <div className="h-3 bg-gray-200 rounded w-16"></div>}
            {item.value && <div className="h-3 bg-gray-100 rounded w-20"></div>}
          </div>
        ))}
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
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {[1, 2, 3].map((sectionIndex) => (
          <div
            key={sectionIndex}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse"
            style={{ animationDelay: `${sectionIndex * 0.1}s` }}
          >
            {/* Section header */}
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </div>

            {/* Section fields */}
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((fieldIndex) => (
                <div key={fieldIndex} className="space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-28"></div>
                  <div className="h-9 bg-gray-100 rounded"></div>
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
    <div className="p-6">
      {/* Header with "Nueva Tarea" button */}
      <div className="flex items-center justify-between mb-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32"></div>
        <div className="h-8 bg-blue-100 rounded w-28"></div>
      </div>

      {/* Task list skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="bg-white border border-gray-200 rounded-lg p-3 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div className="h-5 w-5 bg-gray-200 rounded mt-0.5 border border-gray-300"></div>
              
              {/* Task content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Category badge */}
                  <div className={`h-5 bg-gray-200 rounded-full w-16 ${i === 1 ? 'bg-blue-100' : ''}`}></div>
                  {/* Date */}
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                {/* Title */}
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                {/* Notes (only for some tasks) */}
                {i === 1 && (
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
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
    <div className="p-6 bg-white h-full flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
      
      {/* Chat messages skeleton */}
      <div className="flex-1 overflow-y-auto pr-2">
        <ChatLoadingSkeleton variant="default" messageCount={3} />
      </div>
      
      {/* Input skeleton */}
      <div className="mt-4 pt-4 border-t border-gray-200 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-lg"></div>
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
      <div className="border-b border-gray-200 bg-white">
        <div className="flex">
          {['Detalles', 'Actividad', 'Chat'].map((_, i) => (
            <div key={i} className="px-6 py-3 animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`h-4 bg-gray-200 rounded w-16 ${i === 0 ? 'bg-gray-300' : ''}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton - default to details */}
      <OpportunityDetailsSkeleton />
    </div>
  )
}

