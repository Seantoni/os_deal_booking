'use client'

import { useState, useEffect, useMemo } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import EditIcon from '@mui/icons-material/Edit'
import { Button } from '@/components/ui'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FilterListIcon from '@mui/icons-material/FilterList'
import FilterValueInput from './FilterValueInput'
import { 
  getFieldsForEntity, 
  getOperatorsForFieldType, 
  getFieldDefinition,
  mapCustomFieldTypeToFilterType,
  mapCustomFieldEntityType,
  type FilterFieldDefinition 
} from '@/lib/filters/filterConfig'
import type { FilterRule, FilterConjunction, EntityType, SavedFilter } from '@/app/actions/filters'
import { createSavedFilter, updateSavedFilter, deleteSavedFilter } from '@/app/actions/filters'
import { getCustomFields, type CustomField } from '@/app/actions/custom-fields'
import toast from 'react-hot-toast'

interface AdvancedFilterBuilderProps {
  entityType: EntityType
  savedFilters: SavedFilter[]
  onFiltersChange: (rules: FilterRule[]) => void
  onSavedFiltersChange: () => void // Callback to refresh saved filters
  activeFilter?: SavedFilter | null
}

function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyRule(): FilterRule {
  return {
    id: generateRuleId(),
    field: '',
    operator: 'equals',
    value: '',
    conjunction: 'AND',
  }
}

export default function AdvancedFilterBuilder({
  entityType,
  savedFilters,
  onFiltersChange,
  onSavedFiltersChange,
  activeFilter,
}: AdvancedFilterBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rules, setRules] = useState<FilterRule[]>([createEmptyRule()])
  const [filterName, setFilterName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  // Load custom fields for this entity type
  useEffect(() => {
    async function loadCustomFields() {
      // Map filter entity type to custom field entity type
      const customFieldEntityType = entityType === 'deals' ? 'deal' 
        : entityType === 'opportunities' ? 'opportunity' 
        : entityType === 'businesses' ? 'business' 
        : null
      
      if (!customFieldEntityType) return

      const result = await getCustomFields(customFieldEntityType as 'business' | 'opportunity' | 'deal' | 'lead')
      if (result.success && result.data) {
        setCustomFields(result.data)
      }
    }
    loadCustomFields()
  }, [entityType])

  // Merge static fields with custom fields
  const fields = useMemo(() => {
    const staticFields = getFieldsForEntity(entityType)
    
    // Convert custom fields to filter field definitions
    const customFieldDefs: FilterFieldDefinition[] = customFields.map(cf => ({
      key: `customFields.${cf.fieldKey}`,
      label: `${cf.label} (Custom)`,
      type: mapCustomFieldTypeToFilterType(cf.fieldType),
      options: cf.options?.map(opt => ({ value: opt.value, label: opt.label })),
    }))

    return [...staticFields, ...customFieldDefs]
  }, [entityType, customFields])

  // Load rules from active filter when editing
  const handleEditFilter = (filter: SavedFilter) => {
    setEditingFilter(filter)
    setFilterName(filter.name)
    setRules(filter.filters.length > 0 ? filter.filters : [createEmptyRule()])
    setIsExpanded(true)
  }

  const handleAddRule = () => {
    setRules([...rules, createEmptyRule()])
  }

  const handleRemoveRule = (ruleId: string) => {
    if (rules.length > 1) {
      setRules(rules.filter(r => r.id !== ruleId))
    }
  }

  const handleRuleChange = (ruleId: string, field: keyof FilterRule, value: FilterRule[keyof FilterRule]) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r
      
      const updated = { ...r, [field]: value }
      
      // Reset operator and value when field changes
      if (field === 'field' && typeof value === 'string') {
        const fieldDef = getFieldDefinition(entityType, value, fields)
        if (fieldDef) {
          const operators = getOperatorsForFieldType(fieldDef.type)
          updated.operator = operators[0]?.value || 'equals'
          updated.value = ''
        }
      }
      
      return updated
    }))
  }

  const handleApplyFilters = () => {
    // Only apply rules that have a field selected
    const validRules = rules.filter(r => r.field)
    onFiltersChange(validRules)
  }

  const handleClearFilters = () => {
    setRules([createEmptyRule()])
    setFilterName('')
    setEditingFilter(null)
    onFiltersChange([])
  }

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Por favor ingrese un nombre para el filtro')
      return
    }

    const validRules = rules.filter(r => r.field)
    if (validRules.length === 0) {
      toast.error('Por favor agregue al menos una regla de filtro')
      return
    }

    setIsSaving(true)
    try {
      let result
      if (editingFilter) {
        result = await updateSavedFilter(editingFilter.id, filterName.trim(), validRules)
      } else {
        result = await createSavedFilter(filterName.trim(), entityType, validRules)
      }

      if (result.success) {
        toast.success(editingFilter ? '¡Filtro actualizado!' : '¡Filtro guardado!')
        setFilterName('')
        setEditingFilter(null)
        onSavedFiltersChange()
      } else {
        toast.error(result.error || 'Error al guardar el filtro')
      }
    } catch (error) {
      toast.error('Error al guardar el filtro')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este filtro?')) return

    try {
      const result = await deleteSavedFilter(filterId)
      if (result.success) {
        toast.success('Filtro eliminado')
        onSavedFiltersChange()
        if (editingFilter?.id === filterId) {
          handleClearFilters()
        }
      } else {
        toast.error(result.error || 'Error al eliminar el filtro')
      }
    } catch (error) {
      toast.error('Error al eliminar el filtro')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <FilterListIcon className="w-4 h-4 text-gray-500" />
          <span className="text-[14px] font-medium text-gray-700">Filtros Avanzados</span>
          {rules.filter(r => r.field).length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {rules.filter(r => r.field).length} regla{rules.filter(r => r.field).length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ExpandLessIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ExpandMoreIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Saved filters management */}
          {savedFilters.length > 0 && (
            <div className="py-3 border-b border-gray-100 mb-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Filtros Guardados:</p>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map(filter => (
                  <div
                    key={filter.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                      editingFilter?.id === filter.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{filter.name}</span>
                    <button
                      onClick={() => handleEditFilter(filter)}
                      className="p-0.5 hover:bg-gray-200 rounded"
                      title="Editar filtro"
                    >
                      <EditIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteFilter(filter.id)}
                      className="p-0.5 hover:bg-red-100 hover:text-red-600 rounded"
                      title="Eliminar filtro"
                    >
                      <DeleteIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter rules */}
          <div className="space-y-2 py-3">
            {rules.map((rule, index) => {
              const selectedField = getFieldDefinition(entityType, rule.field, fields)
              const operators = selectedField 
                ? getOperatorsForFieldType(selectedField.type)
                : []

              return (
                <div key={rule.id} className="flex items-center gap-2 flex-wrap">
                  {/* Conjunction (AND/OR) - not shown for first rule */}
                  {index > 0 ? (
                    <select
                      value={rule.conjunction}
                      onChange={(e) => handleRuleChange(rule.id, 'conjunction', e.target.value as FilterConjunction)}
                      className="w-16 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  ) : (
                    <div className="w-16 text-xs text-gray-500 text-center">Donde</div>
                  )}

                  {/* Field selector */}
                  <select
                    value={rule.field}
                    onChange={(e) => handleRuleChange(rule.id, 'field', e.target.value)}
                    className="min-w-[160px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Seleccionar campo...</option>
                    {fields.map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator selector */}
                  <select
                    value={rule.operator}
                    onChange={(e) => handleRuleChange(rule.id, 'operator', e.target.value)}
                    disabled={!rule.field}
                    className="min-w-[130px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
                  >
                    {operators.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value input */}
                  {selectedField && (
                    <FilterValueInput
                      field={selectedField}
                      value={rule.value}
                      onChange={(value) => handleRuleChange(rule.id, 'value', value)}
                      operator={rule.operator}
                      disabled={!rule.field}
                    />
                  )}

                  {/* Remove rule button */}
                  <button
                    onClick={() => handleRemoveRule(rule.id)}
                    disabled={rules.length <= 1}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Eliminar regla"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddRule}
                variant="ghost"
                size="sm"
                leftIcon={<AddIcon className="w-4 h-4" />}
                className="text-blue-600 hover:bg-blue-50"
              >
                Agregar Regla
              </Button>
              <Button
                onClick={handleApplyFilters}
                size="sm"
              >
                Aplicar Filtros
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="secondary"
                size="sm"
              >
                Limpiar
              </Button>
            </div>

            {/* Save filter */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Nombre del filtro..."
                className="w-40 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={handleSaveFilter}
                disabled={isSaving || !filterName.trim()}
                size="sm"
                loading={isSaving}
                leftIcon={!isSaving ? <SaveIcon className="w-4 h-4" /> : undefined}
                className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-gray-300"
              >
                {editingFilter ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

