'use client'

import { CATEGORIES } from '@/lib/categories'
import { useState } from 'react'

interface CategoriesSidebarProps {
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
}

export default function CategoriesSidebar({ selectedCategories, onCategoryToggle }: CategoriesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const allSelected = selectedCategories.length === 0

  const toggleAll = () => {
    if (allSelected) return
    // Clear all selections
    selectedCategories.forEach(cat => onCategoryToggle(cat))
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Categories</h2>
        
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="p-2">
        {/* All Categories Option */}
        <button
          onClick={toggleAll}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            allSelected
              ? 'bg-blue-50 text-blue-900 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
            allSelected
              ? 'bg-blue-600 border-blue-600'
              : 'border-gray-300'
          }`}>
            {allSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>All Categories</span>
        </button>

        {/* Divider */}
        <div className="my-2 border-t border-gray-200"></div>

        {/* Category List */}
        <div className="space-y-1">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => {
              const isSelected = selectedCategories.includes(category)
              
              return (
                <button
                  key={category}
                  onClick={() => onCategoryToggle(category)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate">{category}</span>
                </button>
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

