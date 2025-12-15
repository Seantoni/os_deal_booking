'use client'

interface FormModalSkeletonProps {
  /** Number of section cards to show */
  sections?: number
  /** Number of fields per section */
  fieldsPerSection?: number
  /** Show a reference info bar at the top */
  showReferenceBar?: boolean
}

/**
 * Reusable skeleton loading component for form modals (Business, Opportunity, Lead, Deal)
 * Matches the actual form layout with section cards and field placeholders
 */
export default function FormModalSkeleton({
  sections = 3,
  fieldsPerSection = 3,
  showReferenceBar = true,
}: FormModalSkeletonProps) {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Reference info bar skeleton */}
      {showReferenceBar && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      )}

      {/* Section cards */}
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        >
          {/* Section header */}
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>

          {/* Section fields */}
          <div className="p-3 space-y-2.5">
            {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
              <div key={fieldIndex} className="flex items-center gap-3">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="flex-1 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Compact skeleton for smaller modals or sections
 */
export function FormSectionSkeleton({
  fields = 2,
}: {
  fields?: number
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div className="p-3 space-y-2.5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="flex-1 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Full-width field skeleton for use within forms
 */
export function FormFieldSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
      <div className="flex-1 h-8 bg-gray-200 rounded"></div>
    </div>
  )
}

