'use client'

import { getCategoryHierarchy, getMainCategories, getCategoryColors } from '@/lib/categories'
import { useState, useEffect, useMemo } from 'react'
import MiniCalendar from './MiniCalendar'
import type { UserRole, CategoryNode } from '@/types'

// Helper to check if a node is a leaf array
function isLeafArray(node: CategoryNode): node is string[] {
  return Array.isArray(node)
}

interface CategoriesSidebarProps {
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
  showPendingBooking: boolean
  onPendingBookingToggle?: () => void
  userRole?: UserRole
  // Mini calendar navigation props
  onMiniCalendarDateSelect?: (date: Date, mode: 'day') => void
  onMiniCalendarRangeSelect?: (startDate: Date, endDate: Date) => void
  onMiniCalendarMonthSelect?: (year: number, month: number) => void
  onMiniCalendarClearSelection?: () => void
  onMiniCalendarMonthChange?: (year: number, month: number) => void
  selectedMiniDate?: Date | null
  selectedMiniRange?: { start: Date; end: Date } | null
  dayCounts?: Record<string, number>
  isLoadingCounts?: boolean
  pendingCount?: number
}

type SearchCategoryEntry = {
  key: string
  path: string[]
}

export default function CategoriesSidebar({ 
  selectedCategories, 
  onCategoryToggle, 
  showPendingBooking, 
  onPendingBookingToggle, 
  userRole = 'sales',
  onMiniCalendarDateSelect,
  onMiniCalendarRangeSelect,
  onMiniCalendarMonthSelect,
  onMiniCalendarClearSelection,
  onMiniCalendarMonthChange,
  selectedMiniDate,
  selectedMiniRange,
  dayCounts = {},
  isLoadingCounts = false,
  pendingCount = 0,
}: CategoriesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0) // Force re-render when settings change

  // Convert category name to title case (first letter uppercase, rest lowercase)
  const formatCategoryName = (name: string) => {
    if (!name) return name
    return name
      .split(' ')
      .map((word) => {
        if (word.length > 1 && word === word.toUpperCase() && word.length <= 4) return word
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }

  const highlightMatch = (text: string, query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return text

    const sourceText = text
    const lowerText = sourceText.toLowerCase()
    const lowerQuery = trimmedQuery.toLowerCase()
    const matchIndex = lowerText.indexOf(lowerQuery)

    if (matchIndex === -1) return sourceText

    const before = sourceText.slice(0, matchIndex)
    const match = sourceText.slice(matchIndex, matchIndex + trimmedQuery.length)
    const after = sourceText.slice(matchIndex + trimmedQuery.length)

    return (
      <>
        {before}
        <mark className="bg-amber-100 text-amber-900 rounded px-0.5">{match}</mark>
        {after}
      </>
    )
  }

  // Get dynamic category hierarchy (reads from settings)
  const categoryHierarchy = useMemo(() => getCategoryHierarchy(), [refreshKey])
  const mainCategories = useMemo(() => getMainCategories(), [refreshKey])
  const isSearching = searchQuery.trim().length > 0
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  // Listen for storage changes (settings updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'os_booking_settings') {
        // Settings changed, force re-render
        setRefreshKey(prev => prev + 1)
      }
    }

    // Listen for storage events (works across tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events (same-tab updates)
    const handleCustomStorageChange = () => {
      setRefreshKey(prev => prev + 1)
    }
    
    window.addEventListener('settingsUpdated', handleCustomStorageChange as EventListener)

    // Check for updates when window gains focus (user might have changed settings in another tab)
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('settingsUpdated', handleCustomStorageChange as EventListener)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Filter main categories for tree mode (no active search)
  const filteredMainCategories = useMemo(() => {
    return mainCategories.filter(main => {
      if (searchQuery === '') return true;
      if (main.toLowerCase().includes(searchQuery.toLowerCase())) return true;
      
      // Check children
      const subs = categoryHierarchy[main];
      if (!subs) return false;
      
      // Handle recursive structure
      if (isLeafArray(subs)) {
        return subs.some(leaf => leaf.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      
      return Object.entries(subs).some(([sub, leaves]) => {
        if (sub.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        if (isLeafArray(leaves)) {
          return leaves.some(leaf => leaf.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        // If leaves is an object, check its keys
        return Object.keys(leaves).some(key => key.toLowerCase().includes(searchQuery.toLowerCase()));
      });
    });
  }, [mainCategories, categoryHierarchy, searchQuery]);

  // Build a flat index with all selectable paths (main, subcategories and leaves).
  const allCategoryEntries = useMemo<SearchCategoryEntry[]>(() => {
    const entries = new Map<string, SearchCategoryEntry>()

    const addEntry = (path: string[]) => {
      if (path.length === 0) return
      const key = path.join(':')
      if (!entries.has(key)) {
        entries.set(key, { key, path: [...path] })
      }
    }

    const walkNode = (node: CategoryNode, path: string[]) => {
      if (isLeafArray(node)) {
        node.forEach((leaf) => addEntry([...path, leaf]))
        return
      }

      Object.entries(node).forEach(([childKey, childNode]) => {
        const childPath = [...path, childKey]
        addEntry(childPath)
        walkNode(childNode, childPath)
      })
    }

    mainCategories.forEach((mainCategory) => {
      addEntry([mainCategory])
      const node = categoryHierarchy[mainCategory]
      if (!node) return
      walkNode(node, [mainCategory])
    })

    return Array.from(entries.values()).sort((a, b) => a.path.join(' > ').localeCompare(b.path.join(' > ')))
  }, [mainCategories, categoryHierarchy])

  const filteredSearchEntries = useMemo(() => {
    if (!isSearching) return []

    return allCategoryEntries.filter((entry) =>
      entry.path.some((part) => part.toLowerCase().includes(normalizedSearchQuery))
    )
  }, [allCategoryEntries, isSearching, normalizedSearchQuery])

  const toggleExpand = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const allSelected = selectedCategories.length === 0

  const toggleAll = () => {
    if (allSelected) return
    // Clear all selections
    selectedCategories.forEach(cat => onCategoryToggle(cat))
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col">
      {/* Mini Calendar for Quick Navigation */}
      <div className="p-2 border-b border-gray-200 flex-shrink-0">
        <MiniCalendar
          onDateSelect={onMiniCalendarDateSelect}
          onRangeSelect={onMiniCalendarRangeSelect}
          onMonthSelect={onMiniCalendarMonthSelect}
          onClearSelection={onMiniCalendarClearSelection}
          onMonthChange={onMiniCalendarMonthChange}
          selectedDate={selectedMiniDate}
          selectedRange={selectedMiniRange}
          dayCounts={dayCounts}
          isLoadingCounts={isLoadingCounts}
        />
      </div>

      <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0 space-y-2">
        {/* Pending Booking Filter Toggle - Admin only, only show when there are pending */}
        {userRole === 'admin' && onPendingBookingToggle && pendingCount > 0 && (
            <button
              onClick={onPendingBookingToggle}
            className={`w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                showPendingBooking
                  ? 'bg-orange-100 text-orange-900 border border-orange-300'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{showPendingBooking ? 'Pending Booking' : 'Show Pending'}</span>
            </div>
            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{pendingCount}</span>
            </button>
        )}
        
        <div className="relative">
          <svg
            className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.1-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded"
              aria-label="Clear category search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-1.5 py-1 flex-1 overflow-y-auto">
        {!isSearching && (
          <>
            {/* All Categories Option */}
            <button
              onClick={toggleAll}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors ${
                allSelected
                  ? 'bg-blue-50 text-blue-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                allSelected
                  ? 'bg-blue-600 border-transparent'
                  : 'border-gray-300'
              }`}>
                {allSelected && (
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm">All Categories</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-200"></div>
          </>
        )}

        {isSearching && (
          <div className="px-2 pb-2 pt-1 text-xs text-gray-500">
            {filteredSearchEntries.length} match{filteredSearchEntries.length === 1 ? '' : 'es'}
          </div>
        )}

        {/* Category List */}
        <div className="space-y-px">
          {isSearching ? (
            filteredSearchEntries.length > 0 ? (
              filteredSearchEntries.map((entry) => {
                const isSelected = selectedCategories.includes(entry.key)
                const mainCategory = entry.path[0] || null
                const colors = getCategoryColors(mainCategory)
                const formattedPath = entry.path.map(formatCategoryName)
                const primaryLabel = formattedPath[formattedPath.length - 1] || ''
                const parentPath = formattedPath.slice(0, -1).join(' > ')

                return (
                  <button
                    key={entry.key}
                    onClick={() => onCategoryToggle(entry.key)}
                    className={`w-full flex items-start gap-2 px-2 py-2 rounded-md border text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'text-gray-700 bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? `${colors.indicator} border-transparent` : `${colors.border}`
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className={`text-sm ${isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'} break-words`}>
                        {highlightMatch(primaryLabel, searchQuery)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {parentPath ? highlightMatch(parentPath, searchQuery) : 'Main category'}
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No categories found
              </div>
            )
          ) : filteredMainCategories.length > 0 ? (
            filteredMainCategories.map((mainCategory) => {
              const isSelected = selectedCategories.includes(mainCategory)
              const isExpanded = expandedCategories.includes(mainCategory)
              const colors = getCategoryColors(mainCategory)
              const subCategories = categoryHierarchy[mainCategory]
              const hasSubCategories = subCategories && !isLeafArray(subCategories) && Object.keys(subCategories).length > 0

              return (
                <div key={mainCategory} className="space-y-px">
                  <div className="flex items-center gap-0.5">
                     {/* Expand Button */}
                     {hasSubCategories ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(mainCategory);
                          }}
                          className="w-6 h-6 inline-flex items-center justify-center hover:bg-gray-100 rounded text-gray-500"
                        >
                          <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <div className="w-6 h-6" />
                      )}

                    <button
                      onClick={() => onCategoryToggle(mainCategory)}
                      className={`flex-1 flex items-center gap-1.5 px-1.5 py-1.5 rounded text-sm transition-colors ${
                        isSelected
                          ? 'bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? `${colors.indicator} border-transparent`
                          : `${colors.border}`
                      }`}>
                        {isSelected && (
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate font-medium text-sm">{formatCategoryName(mainCategory)}</span>
                    </button>
                  </div>

                  {/* Subcategories */}
                  {isExpanded && hasSubCategories && !isLeafArray(subCategories) && (
                    <div className="ml-5 space-y-px border-l border-gray-100 pl-1.5">
                      {Object.entries(subCategories).map(([subName, leaves]) => {
                        // Use composite key for uniqueness
                        const subKey = `${mainCategory}:${subName}`;
                        const isSubSelected = selectedCategories.includes(subKey);
                        const hasLeaves = isLeafArray(leaves) && leaves.length > 0;
                        
                        return (
                          <div key={subName}>
                            <button
                                onClick={() => onCategoryToggle(subKey)}
                                className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-sm transition-colors ${
                                  isSubSelected
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <div className={`w-2.5 h-2.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                  isSubSelected
                                    ? 'bg-gray-600 border-transparent'
                                    : 'border-gray-300'
                                }`}>
                                  {isSubSelected && (
                                    <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <span className="truncate text-left text-sm">{formatCategoryName(subName)}</span>
                            </button>

                            {/* Leaves */}
                            {hasLeaves && isLeafArray(leaves) && (
                               <div className="ml-4 space-y-px">
                                 {leaves.map(leaf => {
                                   const leafKey = `${mainCategory}:${subName}:${leaf}`;
                                   const isLeafSelected = selectedCategories.includes(leafKey);
                                   return (
                                     <button
                                      key={leaf}
                                      onClick={() => onCategoryToggle(leafKey)}
                                      className={`w-full flex items-center gap-1.5 px-1 py-1 rounded text-sm transition-colors ${
                                        isLeafSelected
                                          ? 'text-blue-700 font-medium'
                                          : 'text-gray-500 hover:text-gray-900'
                                      }`}
                                     >
                                        <div className={`w-2 h-2 rounded border flex items-center justify-center flex-shrink-0 ${
                                          isLeafSelected
                                            ? 'bg-blue-400 border-transparent'
                                            : 'border-gray-300'
                                        }`}>
                                          {isLeafSelected && (
                                            <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </div>
                                        <span className="truncate text-left text-sm">{formatCategoryName(leaf)}</span>
                                     </button>
                                   )
                                 })}
                               </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No categories found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
