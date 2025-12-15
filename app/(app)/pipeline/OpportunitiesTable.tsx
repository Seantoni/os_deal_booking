'use client'

import { useState, useMemo, useCallback } from 'react'
import { Opportunity, BookingRequest } from '@/types'
import OpportunityFormModal from '@/components/crm/opportunity/OpportunityFormModal'
import { EntityTable, RowActionsMenu, StatusPill } from '@/components/shared/table'
import { type ColumnConfig } from '@/components/shared'

type PipelineItem = {
  opportunity: Opportunity | null
  bookingRequest: BookingRequest | null
}

interface OpportunitiesTableProps {
  data: PipelineItem[]
  searchQuery: string
}

export default function OpportunitiesTable({ data, searchQuery }: OpportunitiesTableProps) {
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    const q = searchQuery.toLowerCase()
    return data.filter(item => item.opportunity?.business?.name.toLowerCase().includes(q))
  }, [data, searchQuery])

  const stageLabels: Record<string, string> = {
    iniciacion: 'Iniciación',
    reunion: 'Reunión',
    propuesta_enviada: 'Propuesta Enviada',
    propuesta_aprobada: 'Propuesta Aprobada',
    won: 'Won',
    lost: 'Lost',
  }

  const getTone = useCallback((stage?: string) => {
    switch (stage) {
      case 'won':
        return 'success'
      case 'lost':
        return 'danger'
      case 'propuesta_aprobada':
        return 'info'
      case 'propuesta_enviada':
        return 'warning'
      default:
        return 'neutral'
    }
  }, [])

  const columns: ColumnConfig[] = [
    { key: 'business', label: 'Business Name' },
    { key: 'created', label: 'Created Date' },
    { key: 'stage', label: 'Stage' },
    { key: 'actions', label: '', align: 'right', width: 'w-10' },
  ]

  return (
    <>
    <EntityTable
      columns={columns}
      sortColumn={null}
      sortDirection={'asc'}
      onSort={() => {}}
    >
      {filteredData.map((item) => (
        <tr key={item.opportunity?.id} className="group hover:bg-gray-50 transition-colors">
          <td className="px-4 py-[5px] font-medium text-gray-900 text-[13px]">
            {item.opportunity?.business?.name}
          </td>
          <td className="px-4 py-[5px] text-gray-600 text-[13px]">
            {new Date(item.opportunity?.createdAt || '').toLocaleDateString()}
          </td>
          <td className="px-4 py-[5px]">
            <StatusPill
              label={stageLabels[item.opportunity?.stage || ''] || item.opportunity?.stage || '-'}
              tone={getTone(item.opportunity?.stage)}
            />
          </td>
          <td className="px-4 py-[5px] text-right">
            <RowActionsMenu
              isOpen={menuOpen === item.opportunity?.id}
              onOpenChange={(open) => setMenuOpen(open ? item.opportunity?.id || null : null)}
              items={[
                {
                  label: 'Edit',
                  onClick: () => {
                    setSelectedOpportunity(item.opportunity)
                    setOpportunityModalOpen(true)
                  },
                },
              ]}
            />
          </td>
        </tr>
      ))}
    </EntityTable>

      <OpportunityFormModal
        isOpen={opportunityModalOpen}
        onClose={() => setOpportunityModalOpen(false)}
        opportunity={selectedOpportunity}
        onSuccess={() => {}} 
      />
    </>
  )
}

