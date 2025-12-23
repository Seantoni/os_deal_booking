'use client'

import { useState, useMemo } from 'react'
import { REQUEST_FORM_STEPS, getTemplates } from '@/lib/config/request-form-fields'
import type { RequestFormFieldsConfig } from '@/types'
import { Input, Button } from '@/components/ui'

// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'

interface RequestFormFieldsTabProps {
  settings: {
    requestFormFields?: RequestFormFieldsConfig
  }
  onUpdate: (requestFormFields: RequestFormFieldsConfig) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

const isDev = process.env.NODE_ENV === 'development'

export default function RequestFormFieldsTab({ settings, onUpdate, onRefresh, isRefreshing }: RequestFormFieldsTabProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1])) // Start with first step expanded
  const [searchQuery, setSearchQuery] = useState('')
  const [templateFilter, setTemplateFilter] = useState<string>('all')
  const [showOnlyRequired, setShowOnlyRequired] = useState(false)
  
  const templates = useMemo(() => getTemplates(), [])
  
  const requestFormFields = settings.requestFormFields || {}
  
  // Debug: Log initial settings (only on first render to reduce noise)
  // console.log('[RequestFormFieldsTab] Rendering with:', {
  //   businessName_required: requestFormFields.businessName?.required,
  //   partnerEmail_required: requestFormFields.partnerEmail?.required,
  // })

  const toggleStep = (stepId: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }

  const toggleRequired = (fieldKey: string) => {
    const currentValue = requestFormFields[fieldKey]?.required ?? false
    const newValue = !currentValue
    const updated = {
      ...requestFormFields,
      [fieldKey]: { required: newValue },
    }
    if (isDev) console.log(`[RequestFormFieldsTab] Toggled ${fieldKey}: ${currentValue} → ${newValue}`)
    onUpdate(updated)
  }

  const toggleAllInStep = (stepId: number, setRequired: boolean) => {
    const step = REQUEST_FORM_STEPS.find(s => s.id === stepId)
    if (!step) return

    const updated = { ...requestFormFields }
    step.fields.forEach(field => {
      // Only toggle visible fields (based on current filters)
      if (isFieldVisible(field)) {
        updated[field.key] = { required: setRequired }
      }
    })
    onUpdate(updated)
  }

  const isFieldVisible = (field: { key: string; label: string; template?: string }) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!field.key.toLowerCase().includes(query) && !field.label.toLowerCase().includes(query)) {
        return false
      }
    }
    
    // Template filter
    if (templateFilter !== 'all') {
      if (templateFilter === 'base') {
        if (field.template) return false
      } else {
        if (field.template !== templateFilter) return false
      }
    }
    
    // Required filter
    if (showOnlyRequired) {
      if (!requestFormFields[field.key]?.required) return false
    }
    
    return true
  }

  const getVisibleFieldsCount = (step: typeof REQUEST_FORM_STEPS[0]) => {
    return step.fields.filter(isFieldVisible).length
  }

  const getRequiredCount = (step: typeof REQUEST_FORM_STEPS[0]) => {
    return step.fields.filter(f => requestFormFields[f.key]?.required).length
  }

  const getTotalRequiredCount = () => {
    let count = 0
    REQUEST_FORM_STEPS.forEach(step => {
      step.fields.forEach(field => {
        if (requestFormFields[field.key]?.required) count++
      })
    })
    return count
  }

  const expandAll = () => {
    setExpandedSteps(new Set(REQUEST_FORM_STEPS.map(s => s.id)))
  }

  const collapseAll = () => {
    setExpandedSteps(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Request Form Fields</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure which fields are required in the booking request form. 
            <span className="ml-1 font-medium text-blue-600">{getTotalRequiredCount()} required fields</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="!gap-1"
            >
              <RefreshIcon style={{ fontSize: 16 }} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
          <div className="w-px h-4 bg-gray-200" />
          <Button
            variant="ghost"
            size="xs"
            onClick={expandAll}
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fields..."
            leftIcon={<SearchIcon style={{ fontSize: 18 }} />}
            size="sm"
          />
        </div>

        {/* Template Filter - Using native select for optgroup support */}
        <div className="flex items-center gap-2">
          <FilterListIcon className="text-gray-400" style={{ fontSize: 18 }} />
          <div className="relative">
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 appearance-none pr-8"
            >
              <option value="all">All Fields</option>
              <option value="base">Base Fields Only</option>
              <optgroup label="Category Templates">
                {templates.map(template => (
                  <option key={template} value={template}>{template}</option>
                ))}
              </optgroup>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Show Only Required Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyRequired}
            onChange={(e) => setShowOnlyRequired(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700">Show required only</span>
        </label>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {REQUEST_FORM_STEPS.map((step) => {
          const visibleCount = getVisibleFieldsCount(step)
          const requiredCount = getRequiredCount(step)
          const isExpanded = expandedSteps.has(step.id)
          
          // Skip steps with no visible fields
          if (visibleCount === 0) return null

          return (
            <div
              key={step.id}
              className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
            >
              {/* Step Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {step.id}
                </div>
                
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {visibleCount} field{visibleCount !== 1 ? 's' : ''}
                    {requiredCount > 0 && (
                      <span className="ml-1 text-red-600 font-medium">
                        ({requiredCount} required)
                      </span>
                    )}
                  </span>
                  
                  {/* Quick actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => toggleAllInStep(step.id, true)}
                      title="Set all visible fields as required"
                      className="!text-[10px] !px-2 !py-0.5 !text-green-700 !bg-green-50 hover:!bg-green-100 !border-green-200"
                    >
                      All Required
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => toggleAllInStep(step.id, false)}
                      title="Set all visible fields as optional"
                      className="!text-[10px] !px-2 !py-0.5"
                    >
                      All Optional
                    </Button>
                  </div>

                  {isExpanded ? (
                    <ExpandLessIcon className="text-gray-400" />
                  ) : (
                    <ExpandMoreIcon className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* Step Fields */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {step.fields.filter(isFieldVisible).map((field) => {
                    const isRequired = requestFormFields[field.key]?.required ?? false
                    
                    return (
                      <div
                        key={field.key}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                          isRequired ? 'bg-red-50/30' : ''
                        }`}
                      >
                        {/* Field Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {field.label}
                            </span>
                            {isRequired && (
                              <span className="text-red-500 text-xs font-medium">*</span>
                            )}
                            {field.template && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                                {field.template}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{field.key}</span>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => toggleRequired(field.key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            isRequired ? 'bg-red-500' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isRequired ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-xs font-medium w-16 ${isRequired ? 'text-red-600' : 'text-gray-500'}`}>
                          {isRequired ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {REQUEST_FORM_STEPS.every(step => getVisibleFieldsCount(step) === 0) && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No fields match your filters.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setTemplateFilter('all')
              setShowOnlyRequired(false)
            }}
            className="mt-2"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
