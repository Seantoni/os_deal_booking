'use client'

import { useState, useEffect, useTransition } from 'react'
import { getSettings, saveSettings, resetSettings, DEFAULT_SETTINGS, type BookingSettings } from '@/lib/settings'
import { INITIAL_CATEGORY_HIERARCHY } from '@/lib/categories'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CategoryIcon from '@mui/icons-material/Category'
import DnsIcon from '@mui/icons-material/Dns'
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
import HistoryIcon from '@mui/icons-material/History'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import ScheduleIcon from '@mui/icons-material/Schedule'
import './styles.css'

const isDev = process.env.NODE_ENV === 'development'

export default function SettingsPageClient() {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; deactivated: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'form-builder' | 'system' | 'access' | 'email-preview' | 'public-pages' | 'api-logs' | 'comments-log' | 'cron-jobs'>('general')
  const { isAdmin } = useUserRole()
  const [formBuilderSubTab, setFormBuilderSubTab] = useState<'entity-fields' | 'request-form'>('entity-fields')
  const confirmDialog = useConfirmDialog()
  const [isPending, startTransition] = useTransition()

  // Wrap tab changes in startTransition for better INP
  const handleTabChange = (tab: typeof activeTab) => {
    startTransition(() => {
      setActiveTab(tab)
    })
  }

  const handleSubTabChange = (subTab: typeof formBuilderSubTab) => {
    startTransition(() => {
      setFormBuilderSubTab(subTab)
    })
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="max-w-5xl mx-auto w-full py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configure system preferences and categories</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('general')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <SettingsIcon fontSize="small" style={{ fontSize: 18 }} />
              <span>General</span>
            </button>
            <button
              onClick={() => handleTabChange('categories')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'categories'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CategoryIcon fontSize="small" style={{ fontSize: 18 }} />
              <span>Categories</span>
            </button>
            <button
              onClick={() => handleTabChange('form-builder')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'form-builder'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ViewModuleIcon fontSize="small" style={{ fontSize: 18 }} />
              <span>Form Builder</span>
            </button>
            <button
              onClick={() => handleTabChange('system')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'system'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <DnsIcon fontSize="small" style={{ fontSize: 18 }} />
              <span>System</span>
            </button>
            <button
              onClick={() => handleTabChange('access')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'access'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <PersonAddIcon fontSize="small" style={{ fontSize: 18 }} />
              <span>Access</span>
            </button>
            <button
              onClick={() => handleTabChange('public-pages')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'public-pages'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <PublicIcon fontSize="small" style={{ fontSize: 18 }} />
              <span>Public Pages</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => handleTabChange('email-preview')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'email-preview'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <EmailIcon fontSize="small" style={{ fontSize: 18 }} />
                <span>Email Preview</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleTabChange('api-logs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'api-logs'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <HistoryIcon fontSize="small" style={{ fontSize: 18 }} />
                <span>API Logs</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleTabChange('comments-log')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'comments-log'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ChatBubbleIcon fontSize="small" style={{ fontSize: 18 }} />
                <span>Comentarios</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleTabChange('cron-jobs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'cron-jobs'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ScheduleIcon fontSize="small" style={{ fontSize: 18 }} />
                <span>Cron Jobs</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Bar - Sticky */}
        {(activeTab !== 'system' && activeTab !== 'access' && activeTab !== 'public-pages' && activeTab !== 'api-logs' && activeTab !== 'comments-log' && activeTab !== 'cron-jobs' && (activeTab !== 'form-builder' || formBuilderSubTab === 'request-form')) && (
          <div className="sticky top-2 z-10 bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saved ? (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircleIcon fontSize="small" style={{ fontSize: 16 }} />
                  <span className="text-xs font-medium">Saved!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <InfoIcon fontSize="small" style={{ fontSize: 16 }} />
                  <span className="text-xs">Unsaved changes</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={syncing}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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
          </div>
        )}

        {/* Tab Content */}
        <div className={isPending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {activeTab === 'general' && (
            <GeneralTab settings={settings} setSettings={setSettings} />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab settings={settings} setSettings={setSettings} />
          )}

          {activeTab === 'form-builder' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
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
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <AccessManagementTab />
            </div>
          )}

          {activeTab === 'public-pages' && (
            <PublicPagesTab />
          )}

          {activeTab === 'email-preview' && isAdmin && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <EmailPreviewTab isAdmin={isAdmin} />
            </div>
          )}

          {activeTab === 'api-logs' && isAdmin && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <ApiLogsTab />
            </div>
          )}

          {activeTab === 'comments-log' && isAdmin && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <CommentsLogTab />
            </div>
          )}
        </div>
      </div>

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
