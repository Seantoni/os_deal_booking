'use client'

export type OpportunityTab = 'details' | 'activity' | 'chat' | 'history'

interface OpportunityTabNavProps {
  activeTab: OpportunityTab
  onChange: (tab: OpportunityTab) => void
}

const TABS: Array<{ id: OpportunityTab; label: string }> = [
  { id: 'details', label: 'Detalles' },
  { id: 'activity', label: 'Actividad' },
  { id: 'chat', label: 'Chat' },
  { id: 'history', label: 'Histórico' },
]

export default function OpportunityTabNav({ activeTab, onChange }: OpportunityTabNavProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="flex px-3 md:px-4 pt-2 -mb-px overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 border-gray-200'
                : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
