'use client'

import { useState, useEffect } from 'react'
import HamburgerMenu from '@/components/HamburgerMenu'
import { getSettings, saveSettings, resetSettings, DEFAULT_SETTINGS, type BookingSettings, type BusinessException } from '@/lib/settings'
import { getAllCategories, type CategoryHierarchy, INITIAL_CATEGORY_HIERARCHY } from '@/lib/categories'
import { testOpenAIConnection } from '@/app/actions/openai'
import { useUser } from '@clerk/nextjs'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import './styles.css'

export default function SettingsPageClient() {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'system'>('general')
  const [searchCategory, setSearchCategory] = useState('')
  const [newException, setNewException] = useState<Partial<BusinessException>>({
    businessName: '',
    exceptionType: 'duration',
    exceptionValue: 0,
    notes: '',
  })

  // Category Management State
  const [expandedMain, setExpandedMain] = useState<string | null>(null)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [newMainCategory, setNewMainCategory] = useState('')
  const [newSubCategory, setNewSubCategory] = useState('')
  const [newLeafCategory, setNewLeafCategory] = useState('')
  const [editingMain, setEditingMain] = useState<string | null>(null)
  const [editingMainValue, setEditingMainValue] = useState('')
  const [editingSub, setEditingSub] = useState<{ main: string; sub: string } | null>(null)
  const [editingSubValue, setEditingSubValue] = useState('')
  const [editingLeaf, setEditingLeaf] = useState<{ main: string; sub: string; leaf: string } | null>(null)
  const [editingLeafValue, setEditingLeafValue] = useState('')

  // System Status State
  const { user } = useUser()
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [dbError, setDbError] = useState<string | null>(null)
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle')
  const [openaiError, setOpenaiError] = useState<string | null>(null)
  const [openaiModel, setOpenaiModel] = useState<string | null>(null)

  useEffect(() => {
    const loadedSettings = getSettings()
    setSettings(loadedSettings)
  }, [])

  // Check database status when system tab is active
  useEffect(() => {
    if (activeTab === 'system' && dbStatus === 'checking') {
      checkDatabaseStatus()
    }
  }, [activeTab])

  async function checkDatabaseStatus() {
    try {
      const response = await fetch('/api/health/database')
      const data = await response.json()
      setDbStatus(data.connected ? 'connected' : 'error')
      setDbError(data.error || null)
    } catch (error) {
      setDbStatus('error')
      setDbError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async function checkOpenAIStatus() {
    setOpenaiStatus('checking')
    setOpenaiError(null)
    try {
      const response = await testOpenAIConnection()
      if (response.success) {
        setOpenaiStatus('connected')
        setOpenaiModel(response.model || null)
      } else {
        setOpenaiStatus('error')
        setOpenaiError(response.error || 'Connection failed')
      }
    } catch (error) {
      setOpenaiStatus('error')
      setOpenaiError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings()
      setSettings(DEFAULT_SETTINGS)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const addException = () => {
    if (!newException.businessName || newException.exceptionValue === undefined) {
      alert('Please fill in all required fields')
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

  const filteredCategories = getAllCategories().filter(cat =>
    cat.toLowerCase().includes(searchCategory.toLowerCase())
  )

  // Category Management Functions
  const addMainCategory = () => {
    if (!newMainCategory.trim()) return
    
    const hierarchy = settings.customCategories || INITIAL_CATEGORY_HIERARCHY
    if (hierarchy[newMainCategory]) {
      alert('Category already exists')
      return
    }

    setSettings({
      ...settings,
      customCategories: {
        ...hierarchy,
        [newMainCategory]: {}
      }
    })
    setNewMainCategory('')
  }

  const deleteMainCategory = (main: string) => {
    if (!confirm(`Delete "${main}" and all its subcategories?`)) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    delete hierarchy[main]
    setSettings({ ...settings, customCategories: hierarchy })
  }

  const startEditMain = (main: string) => {
    setEditingMain(main)
    setEditingMainValue(main)
  }

  const saveEditMain = () => {
    if (!editingMain || !editingMainValue.trim()) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    const oldData = hierarchy[editingMain]
    delete hierarchy[editingMain]
    hierarchy[editingMainValue] = oldData
    
    setSettings({ ...settings, customCategories: hierarchy })
    setEditingMain(null)
    setEditingMainValue('')
  }

  const addSubCategory = (main: string) => {
    if (!newSubCategory.trim()) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    if (hierarchy[main][newSubCategory]) {
      alert('Subcategory already exists')
      return
    }

    hierarchy[main] = {
      ...hierarchy[main],
      [newSubCategory]: []
    }
    
    setSettings({ ...settings, customCategories: hierarchy })
    setNewSubCategory('')
  }

  const deleteSubCategory = (main: string, sub: string) => {
    if (!confirm(`Delete "${sub}" and all its items?`)) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    const mainCopy = { ...hierarchy[main] }
    delete mainCopy[sub]
    hierarchy[main] = mainCopy
    
    setSettings({ ...settings, customCategories: hierarchy })
  }

  const startEditSub = (main: string, sub: string) => {
    setEditingSub({ main, sub })
    setEditingSubValue(sub)
  }

  const saveEditSub = () => {
    if (!editingSub || !editingSubValue.trim()) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    const oldData = hierarchy[editingSub.main][editingSub.sub]
    const mainCopy = { ...hierarchy[editingSub.main] }
    delete mainCopy[editingSub.sub]
    mainCopy[editingSubValue] = oldData
    hierarchy[editingSub.main] = mainCopy
    
    setSettings({ ...settings, customCategories: hierarchy })
    setEditingSub(null)
    setEditingSubValue('')
  }

  const addLeafCategory = (main: string, sub: string) => {
    if (!newLeafCategory.trim()) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    const leaves = [...(hierarchy[main][sub] || [])]
    
    if (leaves.includes(newLeafCategory)) {
      alert('Item already exists')
      return
    }

    leaves.push(newLeafCategory)
    hierarchy[main] = {
      ...hierarchy[main],
      [sub]: leaves
    }
    
    setSettings({ ...settings, customCategories: hierarchy })
    setNewLeafCategory('')
  }

  const deleteLeafCategory = (main: string, sub: string, leaf: string) => {
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    const leaves = hierarchy[main][sub].filter(l => l !== leaf)
    hierarchy[main] = {
      ...hierarchy[main],
      [sub]: leaves
    }
    
    setSettings({ ...settings, customCategories: hierarchy })
  }

  const startEditLeaf = (main: string, sub: string, leaf: string) => {
    setEditingLeaf({ main, sub, leaf })
    setEditingLeafValue(leaf)
  }

  const saveEditLeaf = () => {
    if (!editingLeaf || !editingLeafValue.trim()) return
    
    const hierarchy = { ...(settings.customCategories || INITIAL_CATEGORY_HIERARCHY) }
    const leaves = hierarchy[editingLeaf.main][editingLeaf.sub].map(l => 
      l === editingLeaf.leaf ? editingLeafValue : l
    )
    hierarchy[editingLeaf.main] = {
      ...hierarchy[editingLeaf.main],
      [editingLeaf.sub]: leaves
    }
    
    setSettings({ ...settings, customCategories: hierarchy })
    setEditingLeaf(null)
    setEditingLeafValue('')
  }

  const currentHierarchy = settings.customCategories || INITIAL_CATEGORY_HIERARCHY

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HamburgerMenu />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 ml-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-lg text-gray-600">Configure your calendar booking preferences and manage categories</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-t-lg shadow-sm border-b border-gray-200">
          <div className="flex gap-2 px-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-4 font-semibold transition-all relative ${
                activeTab === 'general'
                  ? 'text-blue-600 border-b-3'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <SettingsIcon fontSize="small" />
                <span>General & Restrictions</span>
              </div>
              {activeTab === 'general' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-4 font-semibold transition-all relative ${
                activeTab === 'categories'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Categories Hierarchy</span>
              </div>
              {activeTab === 'categories' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-6 py-4 font-semibold transition-all relative ${
                activeTab === 'system'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>System Status</span>
              </div>
              {activeTab === 'system' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
              )}
            </button>
          </div>
        </div>

        {/* Save Bar - Sticky (only show for general and categories tabs) */}
        {activeTab !== 'system' && (
          <div className="sticky top-4 z-10 bg-white rounded-lg shadow-lg p-4 mb-6 flex items-center justify-between border border-gray-200">
            <div className="flex items-center gap-3">
              {saved ? (
                <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                  <CheckCircleIcon className="animate-bounce" />
                  <span className="font-semibold">Settings saved successfully!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <InfoIcon fontSize="small" />
                  <span className="text-sm">Make changes and click Save to apply</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium shadow-sm"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* General Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Daily Launch Limits */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">Daily Launch Limits</h2>
                <p className="text-sm text-gray-600 mt-1">Control the minimum and maximum events per day</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border-2 border-green-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">Min</span>
                    Minimum Daily Launches
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minDailyLaunches}
                    onChange={(e) => setSettings({ ...settings, minDailyLaunches: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-600 mt-2 text-center">events per day</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-white p-5 rounded-xl border-2 border-orange-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">Max</span>
                    Maximum Daily Launches
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.maxDailyLaunches}
                    onChange={(e) => setSettings({ ...settings, maxDailyLaunches: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-600 mt-2 text-center">events per day</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3 text-sm text-blue-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <InfoIcon fontSize="small" className="mt-0.5 flex-shrink-0 text-blue-500" />
                <p className="leading-relaxed">These limits help maintain a balanced daily launch schedule. Days below minimum or above maximum will be highlighted in the calendar view.</p>
              </div>
            </div>

            {/* Category Duration Limits */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Category Duration Limits</h2>
                  <p className="text-sm text-gray-600 mt-1">Set maximum days for each category</p>
                </div>
                <div className="text-sm text-gray-500">
                  {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
                </div>
              </div>
              
              <div className="mb-4 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fontSize="small" />
                <input
                  type="text"
                  placeholder="Search categories by name..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {searchCategory && (
                  <button
                    onClick={() => setSearchCategory('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <ClearIcon fontSize="small" />
                  </button>
                )}
              </div>

              {filteredCategories.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="mx-auto text-gray-300 mb-3" style={{ fontSize: '48px' }} />
                  <p className="text-gray-500 font-medium">No categories found</p>
                  <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCategories.map(category => (
                    <div key={category} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">{category}</span>
                      <div className="flex items-center gap-3">
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
                          className="w-20 px-3 py-2 text-sm text-center font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600 font-medium min-w-[40px]">days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Merchant Repeat Days */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">Merchant Restrictions</h2>
                <p className="text-sm text-gray-600 mt-1">Set minimum days between repeat bookings</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border-2 border-purple-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Minimum Days Between Same Merchant
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    value={settings.merchantRepeatDays}
                    onChange={(e) => setSettings({ ...settings, merchantRepeatDays: parseInt(e.target.value) || 30 })}
                    className="w-32 px-4 py-3 text-lg font-bold text-center border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  />
                  <span className="text-gray-700 font-medium">days</span>
                </div>
                <p className="mt-3 text-sm text-gray-600 bg-white p-3 rounded-lg">
                  <span className="font-semibold text-gray-700">Example:</span> If set to 30 days, the same merchant cannot appear again within 30 days of their last booking end date.
                </p>
              </div>
            </div>

            {/* Business Exceptions */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">Business Exceptions</h2>
                <p className="text-sm text-gray-600 mt-1">Create custom rules for specific businesses</p>
              </div>
              
              {/* Add New Exception Form */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AddIcon className="text-blue-600" fontSize="small" />
                  Add New Exception
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Business Name *"
                    value={newException.businessName}
                    onChange={(e) => setNewException({ ...newException, businessName: e.target.value })}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <select
                    value={newException.exceptionType}
                    onChange={(e) => setNewException({ ...newException, exceptionType: e.target.value as 'duration' | 'repeatDays' })}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
                  >
                    <option value="duration">Duration Override</option>
                    <option value="repeatDays">Repeat Days Override</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Value (days) *"
                    value={newException.exceptionValue || ''}
                    onChange={(e) => setNewException({ ...newException, exceptionValue: parseInt(e.target.value) || 0 })}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={newException.notes}
                    onChange={(e) => setNewException({ ...newException, notes: e.target.value })}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <button
                  onClick={addException}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <AddIcon fontSize="small" />
                  Add Exception
                </button>
              </div>

              {/* Existing Exceptions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Active Exceptions</h3>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">
                    {settings.businessExceptions.length} {settings.businessExceptions.length === 1 ? 'exception' : 'exceptions'}
                  </span>
                </div>
                {settings.businessExceptions.map((exception, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${exception.exceptionType === 'duration' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                        {exception.businessName}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-md font-medium ${exception.exceptionType === 'duration' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {exception.exceptionType === 'duration' ? 'Duration' : 'Repeat Days'}: {exception.exceptionValue} days
                        </span>
                        {exception.notes && (
                          <span className="text-gray-500 italic">"{exception.notes}"</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeException(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete exception"
                    >
                      <DeleteIcon fontSize="small" />
                    </button>
                  </div>
                ))}
                {settings.businessExceptions.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No business exceptions added yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add your first exception using the form above</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab Content */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Manage Category Hierarchy</h2>
              <p className="text-sm text-gray-600 mt-1">Create and organize your category structure with main categories, subcategories, and items</p>
            </div>
            
            {/* Add Main Category */}
            <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AddIcon className="text-green-600" fontSize="small" />
                Add New Main Category
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter main category name (e.g., RESTAURANTS, HOTELS)..."
                  value={newMainCategory}
                  onChange={(e) => setNewMainCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMainCategory()}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                />
                <button
                  onClick={addMainCategory}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
                >
                  <AddIcon fontSize="small" />
                  Add Category
                </button>
              </div>
            </div>

            {/* Category Tree */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Category Structure</h3>
                <span className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full font-medium">
                  {Object.keys(currentHierarchy).length} main {Object.keys(currentHierarchy).length === 1 ? 'category' : 'categories'}
                </span>
              </div>
              {Object.keys(currentHierarchy).map((main: string) => (
                <div key={main} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all">
                  {/* Main Category */}
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white group hover:from-blue-50 hover:to-white transition-all">
                    <button
                      onClick={() => setExpandedMain(expandedMain === main ? null : main)}
                      className="p-2 hover:bg-white rounded-lg transition-all shadow-sm"
                    >
                      {expandedMain === main ? 
                        <KeyboardArrowDownIcon className="text-blue-600" /> : 
                        <KeyboardArrowRightIcon className="text-gray-600" />
                      }
                    </button>
                    
                    {editingMain === main ? (
                      <input
                        type="text"
                        value={editingMainValue}
                        onChange={(e) => setEditingMainValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditMain()}
                        onBlur={saveEditMain}
                        className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="flex-1 font-bold text-gray-900 text-lg">{main}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
                          {Object.keys(currentHierarchy[main]).length} sub
                        </span>
                      </>
                    )}
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditMain(main)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                        title="Edit category name"
                      >
                        <EditIcon fontSize="small" />
                      </button>
                      <button
                        onClick={() => deleteMainCategory(main)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                        title="Delete category"
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {expandedMain === main && (
                    <div className="p-5 pl-16 space-y-3 bg-gray-50">
                      {/* Add Subcategory */}
                      <div className="flex gap-2 mb-4 p-3 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <input
                          type="text"
                          placeholder="Add new subcategory..."
                          value={newSubCategory}
                          onChange={(e) => setNewSubCategory(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSubCategory(main)}
                          className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => addSubCategory(main)}
                          className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center gap-1"
                        >
                          <AddIcon fontSize="small" />
                          Add
                        </button>
                      </div>

                      {Object.keys(currentHierarchy[main]).map(sub => (
                        <div key={sub} className="border-l-2 border-blue-300 pl-3">
                          {/* Sub Category */}
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => setExpandedSub(expandedSub === `${main}:${sub}` ? null : `${main}:${sub}`)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {expandedSub === `${main}:${sub}` ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            </button>
                            
                            {editingSub?.main === main && editingSub?.sub === sub ? (
                              <input
                                type="text"
                                value={editingSubValue}
                                onChange={(e) => setEditingSubValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && saveEditSub()}
                                onBlur={saveEditSub}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                autoFocus
                              />
                            ) : (
                              <span className="flex-1 font-medium text-gray-800">{sub}</span>
                            )}
                            
                            <button
                              onClick={() => startEditSub(main, sub)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <EditIcon fontSize="inherit" />
                            </button>
                            <button
                              onClick={() => deleteSubCategory(main, sub)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <DeleteIcon fontSize="inherit" />
                            </button>
                          </div>

                          {/* Leaf Categories */}
                          {expandedSub === `${main}:${sub}` && (
                            <div className="pl-6 space-y-1">
                              {/* Add Leaf */}
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  placeholder="New item..."
                                  value={newLeafCategory}
                                  onChange={(e) => setNewLeafCategory(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && addLeafCategory(main, sub)}
                                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md"
                                />
                                <button
                                  onClick={() => addLeafCategory(main, sub)}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                  <AddIcon fontSize="inherit" />
                                </button>
                              </div>

                              {currentHierarchy[main][sub].map(leaf => (
                                <div key={leaf} className="flex items-center gap-2 py-1">
                                  {editingLeaf?.main === main && editingLeaf?.sub === sub && editingLeaf?.leaf === leaf ? (
                                    <input
                                      type="text"
                                      value={editingLeafValue}
                                      onChange={(e) => setEditingLeafValue(e.target.value)}
                                      onKeyPress={(e) => e.key === 'Enter' && saveEditLeaf()}
                                      onBlur={saveEditLeaf}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="flex-1 text-sm text-gray-700">• {leaf}</span>
                                  )}
                                  
                                  <button
                                    onClick={() => startEditLeaf(main, sub, leaf)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <EditIcon fontSize="inherit" />
                                  </button>
                                  <button
                                    onClick={() => deleteLeafCategory(main, sub, leaf)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <DeleteIcon fontSize="inherit" />
                                  </button>
                                </div>
                              ))}
                              {currentHierarchy[main][sub].length === 0 && (
                                <div className="text-xs text-gray-500 italic py-2">No items yet</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {Object.keys(currentHierarchy[main]).length === 0 && (
                        <div className="text-sm text-gray-500 italic">No subcategories yet</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Status Tab Content */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Health Checks Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">System Health Checks</h2>
                <p className="text-sm text-gray-600 mt-1">Monitor the status of all system connections and services</p>
              </div>

              <div className="space-y-4">
                {/* Clerk Authentication Status */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-semibold text-gray-900">Clerk Authentication</p>
                      <p className="text-xs text-gray-600">User authentication service</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user ? '✓ Connected' : '✗ Not Connected'}
                  </span>
                </div>

                {/* Database Status */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      dbStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                      dbStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                      'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-semibold text-gray-900">Database (Neon PostgreSQL)</p>
                      <p className="text-xs text-gray-600">Primary data storage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      dbStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                      dbStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {dbStatus === 'connected' ? '✓ Connected' : dbStatus === 'checking' ? '⟳ Checking...' : '✗ Error'}
                    </span>
                    {dbStatus !== 'checking' && (
                      <button
                        onClick={checkDatabaseStatus}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Recheck
                      </button>
                    )}
                  </div>
                </div>

                {dbError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800"><strong>Database Error:</strong> {dbError}</p>
                  </div>
                )}

                {/* OpenAI API Status */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-white rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      openaiStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                      openaiStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                      openaiStatus === 'idle' ? 'bg-gray-400' :
                      'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-semibold text-gray-900">OpenAI API</p>
                      <p className="text-xs text-gray-600">PDF parsing & AI features</p>
                      {openaiModel && (
                        <p className="text-xs text-emerald-700 font-medium mt-1">Model: {openaiModel}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      openaiStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                      openaiStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                      openaiStatus === 'idle' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {openaiStatus === 'connected' ? '✓ Connected' : 
                       openaiStatus === 'checking' ? '⟳ Checking...' : 
                       openaiStatus === 'idle' ? 'Not Tested' :
                       '✗ Error'}
                    </span>
                    <button
                      onClick={checkOpenAIStatus}
                      disabled={openaiStatus === 'checking'}
                      className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
                    >
                      {openaiStatus === 'idle' ? 'Test' : 'Recheck'}
                    </button>
                  </div>
                </div>

                {openaiError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800"><strong>OpenAI Error:</strong> {openaiError}</p>
                    <p className="text-xs text-red-600 mt-2">Make sure OPENAI_API_KEY is set in your .env file</p>
                  </div>
                )}

                {/* Resend Email Service Status */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-white rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      process.env.NEXT_PUBLIC_APP_URL ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="font-semibold text-gray-900">Resend Email Service</p>
                      <p className="text-xs text-gray-600">Booking request notifications</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    process.env.NEXT_PUBLIC_APP_URL ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {process.env.NEXT_PUBLIC_APP_URL ? '✓ Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Environment Info */}
            {user && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-gray-900">Current User</h2>
                  <p className="text-sm text-gray-600 mt-1">Logged in user information</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">{user.primaryEmailAddress?.emailAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="text-gray-900">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">User ID:</span>
                    <span className="text-gray-900 font-mono text-xs">{user.id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

