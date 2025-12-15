'use client'

import { useState } from 'react'
import BusinessIcon from '@mui/icons-material/Business'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AddIcon from '@mui/icons-material/Add'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Input, Dropdown, Button } from '@/components/ui'

interface BasicInfoSectionProps {
  businessId: string
  onBusinessChange: (id: string) => void
  startDate: string
  onStartDateChange: (date: string) => void
  closeDate: string
  onCloseDateChange: (date: string) => void
  categoryId: string
  onCategoryChange: (id: string) => void
  tier: string
  onTierChange: (tier: string) => void
  businesses: any[]
  categories: any[]
  showAddTask?: boolean
  onAddTask?: () => void
}

export default function BasicInfoSection({
  businessId,
  onBusinessChange,
  startDate,
  onStartDateChange,
  closeDate,
  onCloseDateChange,
  categoryId,
  onCategoryChange,
  tier,
  onTierChange,
  businesses,
  categories,
  showAddTask,
  onAddTask,
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
        <div className="flex items-center gap-2">
        {showAddTask && onAddTask && (
          <Button
            type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAddTask()
              }}
            size="sm"
            variant="secondary"
            className="text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100"
            leftIcon={<AddIcon style={{ fontSize: 14 }} />}
          >
            Add Task
          </Button>
        )}
          {open ? <ExpandLessIcon fontSize="small" className="text-gray-500" /> : <ExpandMoreIcon fontSize="small" className="text-gray-500" />}
      </div>
      </button>
      {open && (
      <div className="p-3 space-y-2.5">
        {/* Business */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            Business Name <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <Dropdown
              fullWidth
              items={[
                { value: '', label: 'Select a business...' },
                ...businesses.map((business) => ({
                  value: business.id,
                  label: business.name,
                })),
              ]}
              selectedLabel={
                businesses.find((b) => b.id === businessId)?.name || 'Select a business...'
              }
              placeholder="Select a business..."
              onSelect={(val) => onBusinessChange(val)}
            />
          </div>
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            Start Date <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              required
              size="sm"
              leftIcon={<CalendarTodayIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
          </div>
        </div>

        {/* Close Date */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            Close Date
          </label>
          <div className="flex-1">
            <Input
              type="date"
              value={closeDate}
              onChange={(e) => onCloseDateChange(e.target.value)}
              size="sm"
              leftIcon={<CalendarTodayIcon className="text-gray-400" style={{ fontSize: 16 }} />}
            />
          </div>
        </div>

        {/* Category */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            Category
          </label>
          <div className="flex-1">
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
            />
          </div>
        </div>

        {/* Tier */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
            Tier
          </label>
          <div className="flex-1">
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
              placeholder="Select tier..."
              onSelect={(val) => onTierChange(val)}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

