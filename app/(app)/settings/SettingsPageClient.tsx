'use client'

import { useState, useEffect, useTransition } from 'react'
import { getSettings, saveSettings, resetSettings, DEFAULT_SETTINGS, type BookingSettings } from '@/lib/settings'
import { INITIAL_CATEGORY_HIERARCHY } from '@/lib/categories'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CategoryIcon from '@mui/icons-material/Category'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import AccessManagementTab from '@/components/shared/AccessManagementTab'
import GeneralTab from './components/GeneralTab'
import CategoriesTab from './components/CategoriesTab'
import SystemTab from './components/SystemTab'
import EntityFieldsTab from './components/EntityFieldsTab'
import RequestFormFieldsTab from './components/RequestFormFieldsTab'
import toast from 'react-hot-toast'
import DescriptionIcon from '@mui/icons-material/Description'
import BuildIcon from '@mui/icons-material/Build'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import EmailPreviewTab from './components/EmailPreviewTab'
import EmailIcon from '@mui/icons-material/Email'
import PublicIcon from '@mui/icons-material/Public'
import PublicPagesTab from './components/PublicPagesTab'
import ApiLogsTab from './components/ApiLogsTab'
import CommentsLogTab from './components/CommentsLogTab'
import CronJobsTab from './components/CronJobsTab'
import CampaignsTab from './components/CampaignsTab'
import HistoryIcon from '@mui/icons-material/History'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CampaignIcon from '@mui/icons-material/Campaign'
import TuneIcon from '@mui/icons-material/Tune'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import './styles.css'

type TabId = 'general' | 'categories' | 'form-builder' | 'system' | 'access' | 'email-preview' | 'public-pages' | 'api-logs' | 'comments-log' | 'cron-jobs' | 'campaigns'

interface NavItem {
  id: TabId
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Configuration',
    items: [
      { id: 'general', label: 'General', icon: <SettingsIcon style={{ fontSize: 18 }} /> },
      { id: 'categories', label: 'Categories', icon: <CategoryIcon style={{ fontSize: 18 }} /> },
      { id: 'form-builder', label: 'Form Builder', icon: <ViewModuleIcon style={{ fontSize: 18 }} /> },
    ]
  },
  {
    title: 'System',
    items: [
      { id: 'system', label: 'Health & APIs', icon: <MonitorHeartIcon style={{ fontSize: 18 }} /> },
      { id: 'access', label: 'Access Control', icon: <PersonAddIcon style={{ fontSize: 18 }} /> },
    ]
  },
  {
    title: 'Content',
    items: [
      { id: 'public-pages', label: 'Public Pages', icon: <PublicIcon style={{ fontSize: 18 }} /> },
      { id: 'email-preview', label: 'Email Templates', icon: <EmailIcon style={{ fontSize: 18 }} />, adminOnly: true },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { id: 'api-logs', label: 'API Logs', icon: <HistoryIcon style={{ fontSize: 18 }} />, adminOnly: true },
      { id: 'comments-log', label: 'Comments', icon: <ChatBubbleIcon style={{ fontSize: 18 }} />, adminOnly: true },
      { id: 'cron-jobs', label: 'Cron Jobs', icon: <ScheduleIcon style={{ fontSize: 18 }} />, adminOnly: true },
      { id: 'campaigns', label: 'Campaigns', icon: <CampaignIcon style={{ fontSize: 18 }} />, adminOnly: true },
    ]
  },
]

const isDev = process.env.NODE_ENV === 'development'

export default function SettingsPageClient() {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; deactivated: number } | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const { isAdmin } = useUserRole()
  const [formBuilderSubTab, setFormBuilderSubTab] = useState<'entity-fields' | 'request-form'>('entity-fields')
  const confirmDialog = useConfirmDialog()
  const [isPending, startTransition] = useTransition()

  // Wrap tab changes in startTransition for better INP
  const handleTabChange = (tab: TabId) => {
    startTransition(() => {
      setActiveTab(tab)
    })
  }

  const handleSubTabChange = (subTab: typeof formBuilderSubTab) => {
    startTransition(() => {
      setFormBuilderSubTab(subTab)
    })
  }

  // Get current tab label for header
  const getCurrentTabLabel = (): string => {
    for (const group of NAV_GROUPS) {
      const item = group.items.find(i => i.id === activeTab)
      if (item) return item.label
    }
    return 'Settings'
  }

  const [isRefreshingFields, setIsRefreshingFields] = useState(false)

  // Load settings from database
  const loadSettings = async (showToast = false) => {
    if (showToast) setIsRefreshingFields(true)
    try {
      const response = await fetch('/api/settings?t=' + Date.now()) // Cache bust
      if (response.ok) {
        const result = await response.json()
        if (isDev) {
        console.log('[SettingsPageClient] Loaded settings from DB:', {
          success: result.success,
          hasRequestFormFields: !!result.data?.requestFormFields,
          requestFormFieldsCount: result.data?.requestFormFields ? Object.keys(result.data.requestFormFields).length : 0,
        })
        }
        if (result.success && result.data) {
          setSettings(result.data)
          // Also sync to localStorage for backward compatibility
          saveSettings(result.data)
          if (showToast) toast.success('Settings refreshed')
          return
        }
      }
    } catch (error) {
      if (isDev) console.error('[SettingsPageClient] Failed to load settings from DB:', error)
      if (showToast) toast.error('Failed to refresh settings')
    } finally {
      if (showToast) setIsRefreshingFields(false)
    }
    // Fallback to localStorage if DB fails
    const localSettings = getSettings()
    setSettings(localSettings)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      if (isDev) {
      console.log('[SettingsPageClient] Saving settings:', {
        hasRequestFormFields: !!settings.requestFormFields,
        requestFormFieldsCount: settings.requestFormFields ? Object.keys(settings.requestFormFields).length : 0,
      })
      }

      // Save to database
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const saveResult = await response.json()
      if (isDev) console.log('[SettingsPageClient] Save result:', saveResult)
      
      if (!saveResult.success) {
        toast.error(`Failed to save settings: ${saveResult.error}`)
        setSyncing(false)
        return
      }
      
      toast.success('Settings saved successfully!')
      
      // Also save to localStorage for backward compatibility
      saveSettings(settings)
      
      // Sync categories to database if they were modified
      if (activeTab === 'categories' || settings.customCategories) {
        try {
          const response = await fetch('/api/categories/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hierarchy: settings.customCategories || INITIAL_CATEGORY_HIERARCHY,
            }),
          })

          const result = await response.json()
          if (result.success && result.data) {
            setSyncResult(result.data)
            if (isDev) console.log(`[SettingsPageClient] Categories synced: ${result.data.created} created, ${result.data.updated} updated, ${result.data.deactivated} deactivated`)
          } else {
            if (isDev) console.error('[SettingsPageClient] Failed to sync categories:', result.error)
            toast.error(`Failed to sync categories to database: ${result.error}`)
          }
        } catch (error) {
          if (isDev) console.error('[SettingsPageClient] Error syncing categories:', error)
          toast.error(`Error syncing categories: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setSyncResult(null)
      }, 5000)
    } catch (error) {
      if (isDev) console.error('[SettingsPageClient] Error saving settings:', error)
      toast.error(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleReset = async () => {
    const confirmed = await confirmDialog.confirm({
      title: 'Reset Settings',
      message: 'Are you sure you want to reset all settings to defaults? This action cannot be undone.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setSyncing(true)
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        })
        const result = await response.json()
        if (result.success) {
          setSettings(DEFAULT_SETTINGS)
          // Also update localStorage for backward compatibility
          resetSettings()
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          toast.success('Settings reset to defaults')
        } else {
          toast.error(`Failed to reset settings: ${result.error}`)
        }
    } catch (error) {
      if (isDev) console.error('[SettingsPageClient] Error resetting settings:', error)
      toast.error(`Error resetting settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  // Tabs that require save functionality
  const showSaveBar = (activeTab === 'general' || activeTab === 'categories' || (activeTab === 'form-builder' && formBuilderSubTab === 'request-form'))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Get visible nav items for mobile dropdown
  const visibleNavItems = NAV_GROUPS.flatMap(group => 
    group.items.filter(item => !item.adminOnly || isAdmin)
  )

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <TuneIcon style={{ fontSize: 18 }} className="text-gray-500" />
          Settings
        </h1>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-md text-gray-700"
        >
          {getCurrentTabLabel()}
          <svg className={`w-4 h-4 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="grid grid-cols-2 gap-1 p-2">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { handleTabChange(item.id); setMobileNavOpen(false) }}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className="font-medium truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:block w-44 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="px-3 py-3 border-b border-gray-100">
          <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <TuneIcon style={{ fontSize: 16 }} className="text-gray-500" />
            Settings
          </h1>
        </div>
        <nav className="py-1">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin)
            if (visibleItems.length === 0) return null
            
            return (
              <div key={group.title} className="mb-0.5">
                <div className="px-3 py-1.5">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                    {group.title}
                  </span>
                </div>
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className={activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="py-4 md:py-6 px-4 md:px-8 max-w-6xl mx-auto">
          {/* Content Header with Save Bar */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900">{getCurrentTabLabel()}</h2>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                {activeTab === 'general' && 'General system preferences'}
                {activeTab === 'categories' && 'Manage business categories'}
                {activeTab === 'form-builder' && 'Configure form fields and entities'}
                {activeTab === 'system' && 'System health and API integrations'}
                {activeTab === 'access' && 'Manage user access permissions'}
                {activeTab === 'public-pages' && 'Configure public-facing pages'}
                {activeTab === 'email-preview' && 'Preview and test email templates'}
                {activeTab === 'api-logs' && 'View external API request logs'}
                {activeTab === 'comments-log' && 'View all comments activity'}
                {activeTab === 'cron-jobs' && 'Monitor scheduled tasks'}
                {activeTab === 'campaigns' && 'Manage sales campaigns'}
              </p>
            </div>
            
            {/* Save Actions */}
            {showSaveBar && (
              <div className="flex items-center gap-3">
                {saved ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircleIcon fontSize="small" style={{ fontSize: 16 }} />
                    <span className="text-xs font-medium">Saved!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <InfoIcon fontSize="small" style={{ fontSize: 14 }} />
                    <span className="text-xs">Unsaved</span>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={syncing}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {syncing ? (
                    <>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className={isPending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {activeTab === 'general' && (
              <GeneralTab settings={settings} setSettings={setSettings} />
            )}

            {activeTab === 'categories' && (
              <CategoriesTab settings={settings} setSettings={setSettings} />
            )}

            {activeTab === 'form-builder' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Sub-navigation within Form Builder */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => handleSubTabChange('entity-fields')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                      formBuilderSubTab === 'entity-fields'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <BuildIcon style={{ fontSize: 16 }} />
                    <span>Entity Fields</span>
                  </button>
                  <button
                    onClick={() => handleSubTabChange('request-form')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                      formBuilderSubTab === 'request-form'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <DescriptionIcon style={{ fontSize: 16 }} />
                    <span>Request Form</span>
                  </button>
                </div>

                {/* Sub-tab Content */}
                <div className="p-6">
                  {formBuilderSubTab === 'entity-fields' && (
                    <EntityFieldsTab />
                  )}
                  {formBuilderSubTab === 'request-form' && (
                    <RequestFormFieldsTab
                      settings={settings}
                      onUpdate={(requestFormFields) => {
                        setSettings(prev => ({ ...prev, requestFormFields }))
                      }}
                      onRefresh={() => loadSettings(true)}
                      isRefreshing={isRefreshingFields}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <SystemTab />
            )}

            {activeTab === 'access' && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <AccessManagementTab />
              </div>
            )}

            {activeTab === 'public-pages' && (
              <PublicPagesTab />
            )}

            {activeTab === 'email-preview' && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <EmailPreviewTab isAdmin={isAdmin} />
              </div>
            )}

            {activeTab === 'api-logs' && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <ApiLogsTab />
              </div>
            )}

            {activeTab === 'comments-log' && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <CommentsLogTab />
              </div>
            )}

            {activeTab === 'cron-jobs' && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <CronJobsTab />
              </div>
            )}

            {activeTab === 'campaigns' && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <CampaignsTab />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  )
}
