'use client'

import { useState } from 'react'
import BusinessIcon from '@mui/icons-material/Business'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Input, Dropdown, Textarea } from '@/components/ui'

interface BasicInfoSectionProps {
  name: string
  onNameChange: (name: string) => void
  canEditName: boolean
  categoryId: string
  onCategoryChange: (id: string) => void
  tier: string
  onTierChange: (tier: string) => void
  description: string
  onDescriptionChange: (description: string) => void
  categories: any[]
}

export default function BasicInfoSection({
  name,
  onNameChange,
  canEditName,
  categoryId,
  onCategoryChange,
  tier,
  onTierChange,
  description,
  onDescriptionChange,
  categories,
}: BasicInfoSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-left"
        aria-label={open ? 'Collapse section' : 'Expand section'}
      >
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Basic Information</h3>
        {open ? <ExpandLessIcon fontSize="small" className="text-gray-500" /> : <ExpandMoreIcon fontSize="small" className="text-gray-500" />}
      </button>
      {open && (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
            label="Business Name"
              value={name}
              onChange={(e) => {
                if (!canEditName) return
                onNameChange(e.target.value)
              }}
              disabled={!canEditName}
              required
              size="sm"
              leftIcon={<BusinessIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
          
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Category</span>
            <Dropdown
              fullWidth
              items={[
                { value: '', label: 'Select category...' },
                ...categories.map((cat) => ({
                  value: cat.id,
                  label: `${cat.parentCategory}${cat.subCategory1 ? ` > ${cat.subCategory1}` : ''}${cat.subCategory2 ? ` > ${cat.subCategory2}` : ''}`,
                })),
              ]}
              selectedLabel={
                categories.find((cat) => cat.id === categoryId)
                  ? `${categories.find((cat) => cat.id === categoryId).parentCategory}${categories.find((cat) => cat.id === categoryId).subCategory1 ? ` > ${categories.find((cat) => cat.id === categoryId).subCategory1}` : ''}${categories.find((cat) => cat.id === categoryId).subCategory2 ? ` > ${categories.find((cat) => cat.id === categoryId).subCategory2}` : ''}`
                  : 'Select category...'
              }
              placeholder="Select category..."
              onSelect={(val) => onCategoryChange(val)}
              buttonClassName="text-sm py-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Tier</span>
            <Dropdown
              fullWidth
              items={[
                { value: '', label: 'Select tier...' },
                { value: '1', label: 'Tier 1' },
                { value: '2', label: 'Tier 2' },
                { value: '3', label: 'Tier 3' },
              ]}
              selectedLabel={
                (
                  [
                    { value: '', label: 'Select tier...' },
                    { value: '1', label: 'Tier 1' },
                    { value: '2', label: 'Tier 2' },
                    { value: '3', label: 'Tier 3' },
                  ].find(o => o.value === tier)?.label
                ) || 'Select tier...'
              }
              onSelect={(val) => onTierChange(val)}
              buttonClassName="text-sm py-1.5"
            />
          </div>
        </div>

            <Textarea
          label="Description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Business description..."
              rows={3}
          className="text-sm"
            />
      </div>
      )}
    </div>
  )
}

