'use client'

import type { FilterTab } from './EntityPageHeader'

interface FilterTabsProps {
  items: FilterTab[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function FilterTabs({ items, activeId, onChange, className = '' }: FilterTabsProps) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar ${className}`}>
      {items.map((item) => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
              isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`px-1 py-0.5 rounded-full text-[9px] ${
                  isActive ? 'bg-gray-700 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default FilterTabs
