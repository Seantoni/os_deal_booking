'use client'

const isDev = process.env.NODE_ENV === 'development'

import { useState, useEffect, useCallback } from 'react'
import {
  getFormConfiguration,
  initializeFormConfiguration,
  syncBuiltinFieldsToFormConfig,
  createFormSection,
  updateFormSection,
  deleteFormSection,
  reorderSections,
  updateFormFieldConfig,
  moveFieldToSection,
  reorderFieldsInSection,
  syncCustomFieldsToFormConfig,
  addCustomFieldToFormConfig,
  removeCustomFieldFromFormConfig,
} from '@/app/actions/form-config'
import {
  createCustomField,
  updateCustomField,
  deleteCustomFieldByKey,
  type CustomFieldType,
  type SelectOption,
} from '@/app/actions/custom-fields'
import type { 
  FormEntityType, 
  FormSectionWithDefinitions,
  FormFieldWithDefinition,
  FieldWidth,
} from '@/types'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'

// Icons
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import RefreshIcon from '@mui/icons-material/Refresh'

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text (single line)' },
  { value: 'textarea', label: 'Text (multi-line)' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown/Select' },
  { value: 'checkbox', label: 'Checkbox (Yes/No)' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
]

interface CustomFieldFormData {
  label: string
  fieldType: CustomFieldType
  isRequired: boolean
  placeholder: string
  defaultValue: string
  helpText: string
  options: SelectOption[]
  showInTable: boolean
}

const INITIAL_FORM_DATA: CustomFieldFormData = {
  label: '',
  fieldType: 'text',
  isRequired: false,
  placeholder: '',
  defaultValue: '',
  helpText: '',
  options: [{ value: '', label: '' }],
  showInTable: false,
}

export default function EntityFieldsTab() {
  const [activeEntity, setActiveEntity] = useState<FormEntityType>('business')
  const [sections, setSections] = useState<FormSectionWithDefinitions[]>([])
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirmDialog()
  
  // Section management
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [showNewSectionInput, setShowNewSectionInput] = useState(false)
  
  // Drag state
  const [draggedField, setDraggedField] = useState<FormFieldWithDefinition | null>(null)
  const [draggedSection, setDraggedSection] = useState<FormSectionWithDefinitions | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Custom field modal
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false)
  const [editingCustomField, setEditingCustomField] = useState<FormFieldWithDefinition | null>(null)
  const [customFieldFormData, setCustomFieldFormData] = useState<CustomFieldFormData>(INITIAL_FORM_DATA)
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null)

  // Load form configuration
  const loadConfiguration = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getFormConfiguration(activeEntity)
      if (result.success && result.data) {
        setSections(result.data.sections)
        setInitialized(result.data.initialized)
        // Expand all sections by default
        setExpandedSections(new Set(result.data.sections.map(s => s.id)))
      }
    } catch (error) {
      if (isDev) console.error('Failed to load form configuration:', error)
      toast.error('Failed to load form configuration')
    } finally {
      setLoading(false)
    }
  }, [activeEntity])

  useEffect(() => {
    loadConfiguration()
  }, [loadConfiguration])

  // Auto-sync missing built-in fields on load (especially for opportunity categoryId)
  useEffect(() => {
    if (initialized && activeEntity === 'opportunity') {
      // Silently sync in the background
      syncBuiltinFieldsToFormConfig(activeEntity).then(result => {
        if (result.success && result.addedCount > 0) {
          // Reload if fields were added
          loadConfiguration()
        }
      }).catch(() => {
        // Silently fail, user can use manual sync button
      })
    }
  }, [initialized, activeEntity, loadConfiguration])

  // Initialize form configuration
  const handleInitialize = async () => {
    setSaving(true)
    try {
      const result = await initializeFormConfiguration(activeEntity)
      if (result.success) {
        toast.success('Form configuration initialized')
        await loadConfiguration()
      } else {
        toast.error(result.error || 'Failed to initialize')
      }
    } catch (error) {
      toast.error('Failed to initialize form configuration')
    } finally {
      setSaving(false)
    }
  }

  // Sync missing built-in fields (like categoryId)
  const handleSyncBuiltinFields = async () => {
    setSaving(true)
    try {
      const result = await syncBuiltinFieldsToFormConfig(activeEntity)
      if (result.success) {
        if (result.addedCount > 0) {
          toast.success(`Added ${result.addedCount} missing field${result.addedCount !== 1 ? 's' : ''}`)
        } else {
          toast.success('All built-in fields are already present')
        }
        await loadConfiguration()
      } else {
        toast.error(result.error || 'Failed to sync fields')
      }
    } catch (error) {
      toast.error('Failed to sync built-in fields')
    } finally {
      setSaving(false)
    }
  }

  // Section operations
  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return
    
    setSaving(true)
    try {
      const result = await createFormSection(activeEntity, newSectionName.trim())
      if (result.success && result.data) {
        toast.success('Section created')
        setNewSectionName('')
        setShowNewSectionInput(false)
        await loadConfiguration()
      } else {
        toast.error(result.error || 'Failed to create section')
      }
    } catch (error) {
      toast.error('Failed to create section')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSectionName = async (sectionId: string) => {
    if (!editingSectionName.trim()) return
    
    setSaving(true)
    try {
      const result = await updateFormSection(sectionId, { name: editingSectionName.trim() })
      if (result.success) {
        toast.success('Section updated')
        setEditingSectionId(null)
        setEditingSectionName('')
        await loadConfiguration()
      } else {
        toast.error(result.error || 'Failed to update section')
      }
    } catch (error) {
      toast.error('Failed to update section')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Section',
      message: 'Are you sure? Fields will be moved to another section.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })
    
    if (!confirmed) return
    
    setSaving(true)
    try {
      const result = await deleteFormSection(sectionId)
      if (result.success) {
        toast.success('Section deleted')
        await loadConfiguration()
      } else {
        toast.error(result.error || 'Failed to delete section')
      }
    } catch (error) {
      toast.error('Failed to delete section')
    } finally {
      setSaving(false)
    }
  }

  // Field operations
  const handleUpdateField = async (
    fieldId: string, 
    updates: { isVisible?: boolean; isRequired?: boolean; isReadonly?: boolean; width?: FieldWidth }
  ) => {
    setSaving(true)
    try {
      const result = await updateFormFieldConfig(fieldId, updates)
      if (result.success) {
        // Update local state optimistically
        setSections(prev => prev.map(section => ({
          ...section,
          fields: section.fields.map(field => 
            field.id === fieldId ? { ...field, ...updates } as FormFieldWithDefinition : field
          ),
        })))
      } else {
        toast.error(result.error || 'Failed to update field')
        await loadConfiguration() // Reload on error
      }
    } catch (error) {
      toast.error('Failed to update field')
      await loadConfiguration()
    } finally {
      setSaving(false)
    }
  }

  // Custom field modal handlers
  const openAddCustomFieldModal = (sectionId: string) => {
    setTargetSectionId(sectionId)
    setEditingCustomField(null)
    setCustomFieldFormData(INITIAL_FORM_DATA)
    setShowCustomFieldModal(true)
  }

  const openEditCustomFieldModal = (field: FormFieldWithDefinition) => {
    if (field.fieldSource !== 'custom') return
    
    setEditingCustomField(field)
    setTargetSectionId(field.sectionId)
    
    // We need to fetch the full custom field data
    // For now, use what we have
    setCustomFieldFormData({
      label: field.customFieldLabel || field.fieldKey,
      fieldType: (field.customFieldType as CustomFieldType) || 'text',
      isRequired: field.isRequired,
      placeholder: '',
      defaultValue: '',
      helpText: '',
      options: [{ value: '', label: '' }],
      showInTable: false,
    })
    setShowCustomFieldModal(true)
  }

  const handleDeleteCustomField = async (field: FormFieldWithDefinition) => {
    if (field.fieldSource !== 'custom') return

    const confirmed = await confirmDialog.confirm({
      title: 'Delete Custom Field',
      message: `Are you sure you want to delete "${getFieldLabel(field)}"? This will remove it from the form and delete its stored values.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setSaving(true)
    try {
      const removeConfigResult = await removeCustomFieldFromFormConfig(activeEntity, field.fieldKey)
      if (!removeConfigResult.success) {
        toast.error(removeConfigResult.error || 'Failed to remove from form')
        return
      }

      const deleteResult = await deleteCustomFieldByKey(field.fieldKey)
      if (!deleteResult.success) {
        toast.error(deleteResult.error || 'Failed to delete custom field')
        return
      }

      toast.success('Custom field deleted')
      await loadConfiguration()
    } catch (error) {
      toast.error('Failed to delete custom field')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCustomField = async () => {
    if (!customFieldFormData.label.trim()) {
      toast.error('Label is required')
      return
    }

    if (customFieldFormData.fieldType === 'select') {
      const validOptions = customFieldFormData.options.filter(o => o.value.trim() && o.label.trim())
      if (validOptions.length === 0) {
        toast.error('At least one option is required for select fields')
        return
      }
    }

    setSaving(true)
    try {
      const dataToSave = {
        ...customFieldFormData,
        entityType: activeEntity,
        options: customFieldFormData.fieldType === 'select'
          ? customFieldFormData.options.filter(o => o.value.trim() && o.label.trim())
          : undefined,
      }

      let result
      if (editingCustomField) {
        // Update existing custom field - need to get the actual custom field ID
        // For now, we'll use updateCustomField with the fieldKey
        result = await updateCustomField(editingCustomField.fieldKey, dataToSave)
      } else {
        result = await createCustomField(dataToSave)
      }

      if (result.success) {
        toast.success(editingCustomField ? 'Field updated successfully' : 'Field created successfully')
        setShowCustomFieldModal(false)
        
        // Sync custom fields to form config if creating new
        if (!editingCustomField && result.data?.fieldKey) {
          await addCustomFieldToFormConfig(activeEntity, result.data.fieldKey, result.data.isRequired, targetSectionId || undefined)
        } else if (!editingCustomField) {
          await syncCustomFieldsToFormConfig(activeEntity)
        }
        
        await loadConfiguration()
      } else {
        toast.error(result.error || 'Failed to save field')
      }
    } catch (error) {
      toast.error('Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  const addOption = () => {
    setCustomFieldFormData(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }],
    }))
  }

  const removeOption = (index: number) => {
    setCustomFieldFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  // Drag and drop for fields
  const handleFieldDragStart = (e: React.DragEvent, field: FormFieldWithDefinition) => {
    setDraggedField(field)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleFieldDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSectionId(sectionId)
  }

  const handleFieldDrop = async (e: React.DragEvent, targetSectionId: string, targetIndex?: number) => {
    e.preventDefault()
    setDragOverSectionId(null)
    
    if (!draggedField) return

    // If dropping in the same section, just reorder
    if (draggedField.sectionId === targetSectionId) {
      const section = sections.find(s => s.id === targetSectionId)
      if (!section) return

      const fieldIds = section.fields.map(f => f.id)
      const currentIndex = fieldIds.indexOf(draggedField.id)
      const newIndex = targetIndex ?? fieldIds.length - 1

      if (currentIndex !== newIndex) {
        // Reorder
        fieldIds.splice(currentIndex, 1)
        fieldIds.splice(newIndex, 0, draggedField.id)
        
        setSaving(true)
        try {
          const result = await reorderFieldsInSection(targetSectionId, fieldIds)
          if (result.success) {
            await loadConfiguration()
          } else {
            toast.error(result.error || 'Failed to reorder')
          }
        } catch (error) {
          toast.error('Failed to reorder fields')
        } finally {
          setSaving(false)
        }
      }
    } else {
      // Moving to a different section
      setSaving(true)
      try {
        const result = await moveFieldToSection(draggedField.id, targetSectionId, targetIndex)
        if (result.success) {
          toast.success('Field moved')
          await loadConfiguration()
        } else {
          toast.error(result.error || 'Failed to move field')
        }
      } catch (error) {
        toast.error('Failed to move field')
      } finally {
        setSaving(false)
      }
    }

    setDraggedField(null)
  }

  // Drag and drop for sections
  const handleSectionDragStart = (e: React.DragEvent, section: FormSectionWithDefinitions) => {
    setDraggedSection(section)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleSectionDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (!draggedSection) return

    const currentIndex = sections.findIndex(s => s.id === draggedSection.id)
    if (currentIndex === targetIndex) {
      setDraggedSection(null)
      return
    }

    // Reorder sections
    const newOrder = [...sections]
    newOrder.splice(currentIndex, 1)
    newOrder.splice(targetIndex, 0, draggedSection)
    
    setSaving(true)
    try {
      const result = await reorderSections(activeEntity, newOrder.map(s => s.id))
      if (result.success) {
        setSections(newOrder)
      } else {
        toast.error(result.error || 'Failed to reorder sections')
      }
    } catch (error) {
      toast.error('Failed to reorder sections')
    } finally {
      setSaving(false)
      setDraggedSection(null)
    }
  }

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const getFieldLabel = (field: FormFieldWithDefinition): string => {
    if (field.fieldSource === 'custom') {
      return field.customFieldLabel || field.fieldKey
    }
    return field.definition?.label || field.fieldKey
  }

  const getFieldType = (field: FormFieldWithDefinition): string => {
    if (field.fieldSource === 'custom') {
      return field.customFieldType || 'text'
    }
    return field.definition?.type || 'text'
  }

  const canHideField = (field: FormFieldWithDefinition): boolean => {
    if (field.fieldSource === 'custom') return true
    return field.definition?.canHide ?? true
  }

  const canSetRequired = (field: FormFieldWithDefinition): boolean => {
    if (field.fieldSource === 'custom') return true
    return field.definition?.canSetRequired ?? true
  }

  const getFieldTypeLabel = (type: string) => {
    return FIELD_TYPES.find(t => t.value === type)?.label || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Entity Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['business', 'opportunity', 'deal', 'lead'] as FormEntityType[]).map((entity) => (
            <button
              key={entity}
              onClick={() => setActiveEntity(entity)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeEntity === entity
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {entity === 'business' ? 'Businesses' : entity === 'opportunity' ? 'Opportunities' : entity === 'deal' ? 'Deals' : 'Leads'}
            </button>
          ))}
        </nav>
      </div>

      {/* Not Initialized State */}
      {!initialized ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Form not configured yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Initialize the form configuration to start customizing fields and sections.
          </p>
          <button
            onClick={handleInitialize}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Initializing...' : 'Initialize Configuration'}
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Drag to reorder. Add custom fields or configure field visibility, required status, and layout.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncBuiltinFields}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                title="Add missing built-in fields (e.g., Category) to the form"
              >
                <RefreshIcon fontSize="small" />
                Sync Fields
              </button>
              <button
                onClick={() => setShowNewSectionInput(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <AddIcon fontSize="small" />
                Add Section
              </button>
            </div>
          </div>

          {/* New Section Input */}
          {showNewSectionInput && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSection()
                  if (e.key === 'Escape') {
                    setShowNewSectionInput(false)
                    setNewSectionName('')
                  }
                }}
              />
              <button
                onClick={handleCreateSection}
                disabled={saving || !newSectionName.trim()}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
              >
                <CheckIcon fontSize="small" />
              </button>
              <button
                onClick={() => {
                  setShowNewSectionInput(false)
                  setNewSectionName('')
                }}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={`border border-gray-200 rounded-lg bg-white shadow-sm ${
                  dragOverSectionId === section.id ? 'ring-2 ring-blue-400' : ''
                }`}
                onDragOver={(e) => handleFieldDragOver(e, section.id)}
                onDrop={(e) => handleFieldDrop(e, section.id)}
                draggable={!editingSectionId}
                onDragStart={(e) => handleSectionDragStart(e, section)}
                onDragEnd={() => setDraggedSection(null)}
              >
                {/* Section Header */}
                <div 
                  className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-move"
                  onDragOver={handleSectionDragOver}
                  onDrop={(e) => handleSectionDrop(e, sectionIndex)}
                >
                  <DragIndicatorIcon className="text-gray-400" fontSize="small" />
                  
                  <button
                    onClick={() => toggleSectionExpand(section.id)}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    {expandedSections.has(section.id) ? (
                      <ExpandLessIcon fontSize="small" className="text-gray-500" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" className="text-gray-500" />
                    )}
                  </button>

                  {expandedSections.has(section.id) ? (
                    <FolderOpenIcon className="text-blue-500" fontSize="small" />
                  ) : (
                    <FolderIcon className="text-gray-400" fontSize="small" />
                  )}

                  {editingSectionId === section.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSectionName(section.id)
                          if (e.key === 'Escape') {
                            setEditingSectionId(null)
                            setEditingSectionName('')
                          }
                        }}
                      />
                      <button
                        onClick={() => handleUpdateSectionName(section.id)}
                        disabled={saving}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <CheckIcon fontSize="small" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSectionId(null)
                          setEditingSectionName('')
                        }}
                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                      >
                        <CloseIcon fontSize="small" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-medium text-gray-900">{section.name}</span>
                      <span className="text-xs text-gray-400">
                        {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                      </span>
                      
                      {/* Add Custom Field Button */}
                      <button
                        onClick={() => openAddCustomFieldModal(section.id)}
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                        title="Add custom field to this section"
                      >
                        <AddIcon fontSize="small" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setEditingSectionId(section.id)
                          setEditingSectionName(section.name)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                      >
                        <EditIcon fontSize="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        disabled={saving || sections.length <= 1}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                        title={sections.length <= 1 ? 'Cannot delete the only section' : 'Delete section'}
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </>
                  )}
                </div>

                {/* Section Fields */}
                {expandedSections.has(section.id) && (
                  <div className="divide-y divide-gray-100">
                    {section.fields.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">
                        <p>No fields in this section.</p>
                        <button
                          onClick={() => openAddCustomFieldModal(section.id)}
                          className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          + Add custom field
                        </button>
                      </div>
                    ) : (
                      section.fields.map((field, fieldIndex) => (
                        <div
                          key={field.id}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 ${
                            draggedField?.id === field.id ? 'opacity-50' : ''
                          } ${!field.isVisible ? 'bg-gray-50' : ''}`}
                          draggable
                          onDragStart={(e) => handleFieldDragStart(e, field)}
                          onDragEnd={() => setDraggedField(null)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onDrop={(e) => {
                            e.stopPropagation()
                            handleFieldDrop(e, section.id, fieldIndex)
                          }}
                        >
                          <DragIndicatorIcon className="text-gray-300 cursor-move" fontSize="small" />
                          
                          {/* Field Name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${!field.isVisible ? 'text-gray-400' : 'text-gray-900'}`}>
                                {getFieldLabel(field)}
                              </span>
                              {field.isRequired && (
                                <span className="text-red-500 text-xs">*</span>
                              )}
                              {field.fieldSource === 'custom' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                                  Custom
                                </span>
                              )}
                              {field.isReadonly && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
                                  Read-only
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 capitalize">{getFieldTypeLabel(getFieldType(field))}</span>
                          </div>

                          {/* Field Controls */}
                          <div className="flex items-center gap-1">
                            {/* Width Toggle */}
                            <select
                              value={field.width}
                              onChange={(e) => handleUpdateField(field.id, { width: e.target.value as FieldWidth })}
                              className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="full">Full width</option>
                              <option value="half">Half width</option>
                            </select>

                            {/* Required Toggle */}
                            <button
                              onClick={() => handleUpdateField(field.id, { isRequired: !field.isRequired })}
                              disabled={!canSetRequired(field)}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                field.isRequired
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              } ${!canSetRequired(field) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={canSetRequired(field) ? 'Toggle required' : 'Cannot change required status'}
                            >
                              Required
                            </button>

                            {/* Read-only Toggle */}
                            <button
                              onClick={() => handleUpdateField(field.id, { isReadonly: !field.isReadonly })}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                field.isReadonly
                                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                              title="Toggle read-only"
                            >
                              Read-only
                            </button>

                            {/* Edit button for custom fields */}
                            {field.fieldSource === 'custom' && (
                              <button
                                onClick={() => openEditCustomFieldModal(field)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit custom field"
                              >
                                <EditIcon fontSize="small" />
                              </button>
                            )}
                            {field.fieldSource === 'custom' && (
                              <button
                                onClick={() => handleDeleteCustomField(field)}
                                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete custom field"
                              >
                                <DeleteIcon fontSize="small" />
                              </button>
                            )}

                            {/* Visibility Toggle */}
                            <button
                              onClick={() => handleUpdateField(field.id, { isVisible: !field.isVisible })}
                              disabled={!canHideField(field)}
                              className={`p-1.5 rounded transition-colors ${
                                field.isVisible
                                  ? 'text-blue-600 hover:bg-blue-50'
                                  : 'text-gray-400 hover:bg-gray-100'
                              } ${!canHideField(field) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={canHideField(field) ? (field.isVisible ? 'Hide field' : 'Show field') : 'This field cannot be hidden'}
                            >
                              {field.isVisible ? (
                                <VisibilityIcon fontSize="small" />
                              ) : (
                                <VisibilityOffIcon fontSize="small" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {sections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sections configured. Add a section to get started.
            </div>
          )}
        </>
      )}

      {/* Custom Field Modal */}
      {showCustomFieldModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCustomFieldModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCustomField ? 'Edit Custom Field' : 'Add Custom Field'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Adding to: <span className="font-medium capitalize">{activeEntity}</span>
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customFieldFormData.label}
                    onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Priority, Source, Budget"
                  />
                </div>

                {/* Field Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={customFieldFormData.fieldType}
                    onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, fieldType: e.target.value as CustomFieldType }))}
                    disabled={!!editingCustomField}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {editingCustomField && (
                    <p className="text-xs text-gray-500 mt-1">Field type cannot be changed after creation</p>
                  )}
                </div>

                {/* Options for Select fields */}
                {customFieldFormData.fieldType === 'select' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dropdown Options <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Add the options that will appear in the dropdown</p>
                    <div className="space-y-2">
                      {customFieldFormData.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => {
                              const val = e.target.value
                              setCustomFieldFormData(prev => ({
                                ...prev,
                                options: prev.options.map((opt, i) => 
                                  i === index ? { value: val, label: val } : opt
                                ),
                              }))
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Option ${index + 1}`}
                          />
                          {customFieldFormData.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                            >
                              <DeleteIcon style={{ fontSize: 18 }} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addOption}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}

                {/* Placeholder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={customFieldFormData.placeholder}
                    onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Enter value..."
                  />
                </div>

                {/* Default Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={customFieldFormData.defaultValue}
                    onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Help Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Help Text
                  </label>
                  <input
                    type="text"
                    value={customFieldFormData.helpText}
                    onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, helpText: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description shown below the field"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customFieldFormData.isRequired}
                      onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Required</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customFieldFormData.showInTable}
                      onChange={(e) => setCustomFieldFormData(prev => ({ ...prev, showInTable: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show in table view</span>
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFieldModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomField}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingCustomField ? 'Update Field' : 'Create Field')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
