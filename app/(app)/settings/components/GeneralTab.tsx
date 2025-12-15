'use client'

import { useState, useMemo } from 'react'
import { getAllCategories } from '@/lib/categories'
import type { BookingSettings, BusinessException } from '@/lib/settings'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import toast from 'react-hot-toast'

interface GeneralTabProps {
  settings: BookingSettings
  setSettings: (settings: BookingSettings) => void
}

export default function GeneralTab({ settings, setSettings }: GeneralTabProps) {
  const [searchCategory, setSearchCategory] = useState('')
  const [newException, setNewException] = useState<Partial<BusinessException>>({
    businessName: '',
    exceptionType: 'duration',
    exceptionValue: 0,
    notes: '',
  })

  const filteredCategories = useMemo(() => {
    const allCategories = getAllCategories()
    if (!searchCategory) return allCategories
    const query = searchCategory.toLowerCase()
    return allCategories.filter(cat => cat.toLowerCase().includes(query))
  }, [searchCategory])

  const addException = () => {
    if (!newException.businessName || newException.exceptionValue === undefined) {
      toast.error('Please fill in all required fields')
      return
    }

    const exception: BusinessException = {
      id: `exception-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      businessName: newException.businessName,
      exceptionType: newException.exceptionType as 'duration' | 'repeatDays',
      exceptionValue: Number(newException.exceptionValue),
      notes: newException.notes || '',
    }

    setSettings({
      ...settings,
      businessExceptions: [...settings.businessExceptions, exception],
    })

    setNewException({
      businessName: '',
      exceptionType: 'duration',
      exceptionValue: 0,
      notes: '',
    })
  }

  const removeException = (index: number) => {
    setSettings({
      ...settings,
      businessExceptions: settings.businessExceptions.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-4">
      {/* Daily Launch Limits */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Daily Launch Limits</h2>
          <p className="text-xs text-gray-500 mt-0.5">Control events per day</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[10px] font-bold">Min</span>
              Minimum Daily Launches
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.minDailyLaunches}
                onChange={(e) => setSettings({ ...settings, minDailyLaunches: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm font-semibold text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">events</span>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold">Max</span>
              Maximum Daily Launches
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.maxDailyLaunches}
                onChange={(e) => setSettings({ ...settings, maxDailyLaunches: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm font-semibold text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Duration Limits */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Category Durations</h2>
            <p className="text-xs text-gray-500 mt-0.5">Set max days per category</p>
          </div>
          <div className="text-xs text-gray-500">
            {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
          </div>
        </div>
        
        <div className="mb-3 relative">
          <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchCategory && (
            <button
              onClick={() => setSearchCategory('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <ClearIcon style={{ fontSize: 14 }} />
            </button>
          )}
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500">No categories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {filteredCategories.map(category => (
              <div key={category} className="flex flex-col p-2 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition-all group">
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 mb-1.5 truncate" title={category}>{category}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={settings.categoryDurations[category] || 7}
                    onChange={(e) => setSettings({
                      ...settings,
                      categoryDurations: {
                        ...settings.categoryDurations,
                        [category]: parseInt(e.target.value) || 7
                      }
                    })}
                    className="flex-1 px-2 py-1 text-xs text-center font-semibold border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-[10px] text-gray-500 font-medium">days</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merchant Repeat Days */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Merchant Restrictions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Min days between repeat bookings</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Minimum Days Between Same Merchant
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={settings.merchantRepeatDays}
                onChange={(e) => setSettings({ ...settings, merchantRepeatDays: parseInt(e.target.value) || 30 })}
                className="w-16 px-2 py-1 text-sm font-bold text-center border border-purple-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-600 font-medium">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Exceptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Business Exceptions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Custom rules for specific businesses</p>
        </div>
        
        {/* Add New Exception Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <AddIcon fontSize="small" style={{ fontSize: 16 }} className="text-blue-600" />
            Add Exception
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
            <input
              type="text"
              placeholder="Business Name"
              value={newException.businessName}
              onChange={(e) => setNewException({ ...newException, businessName: e.target.value })}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newException.exceptionType}
              onChange={(e) => setNewException({ ...newException, exceptionType: e.target.value as 'duration' | 'repeatDays' })}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="duration">Duration Override</option>
              <option value="repeatDays">Repeat Days Override</option>
            </select>
            <input
              type="number"
              placeholder="Value (days)"
              value={newException.exceptionValue || ''}
              onChange={(e) => setNewException({ ...newException, exceptionValue: parseInt(e.target.value) || 0 })}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addException}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-1"
            >
              <AddIcon style={{ fontSize: 14 }} />
              Add
            </button>
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={newException.notes}
            onChange={(e) => setNewException({ ...newException, notes: e.target.value })}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Existing Exceptions */}
        <div className="space-y-2">
          {settings.businessExceptions.map((exception, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:border-blue-300 transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${exception.exceptionType === 'duration' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                  <span className="text-xs font-semibold text-gray-900 truncate">{exception.businessName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${exception.exceptionType === 'duration' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {exception.exceptionType === 'duration' ? 'Duration' : 'Repeat'}: {exception.exceptionValue}d
                  </span>
                </div>
                {exception.notes && (
                  <div className="text-[10px] text-gray-500 truncate pl-3.5">"{exception.notes}"</div>
                )}
              </div>
              <button
                onClick={() => removeException(index)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                title="Delete exception"
              >
                <DeleteIcon style={{ fontSize: 16 }} />
              </button>
            </div>
          ))}
          {settings.businessExceptions.length === 0 && (
            <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
              <p className="text-xs text-gray-500">No exceptions added</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

