'use client'

import React, { useState } from 'react'
import { INITIAL_CATEGORY_HIERARCHY } from '@/lib/categories'
import type { BookingSettings } from '@/lib/settings'
import type { CategoryNode } from '@/types'
import { FIELD_TEMPLATES } from '@/components/RequestForm/config/field-templates'
import { CATEGORY_TEMPLATE_MAP } from '@/components/RequestForm/config/template-mapping'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'

interface CategoriesTabProps {
  settings: BookingSettings
  setSettings: (settings: BookingSettings) => void
}

// Helper to check if a node is a leaf array
function isLeafArray(node: CategoryNode): node is string[] {
  return Array.isArray(node)
}

// Helper to get all flattened paths from hierarchy
function flattenHierarchy(
  node: CategoryNode,
  parentPath: string[] = [],
  results: { key: string; label: string }[] = []
): { key: string; label: string }[] {
  if (isLeafArray(node)) {
    // It's a leaf array
    for (const leaf of node) {
      const path = [...parentPath, leaf]
      results.push({
        key: path.join(':'),
        label: path.join(' > '),
      })
    }
  } else {
    // It's an object with children
    for (const [key, child] of Object.entries(node)) {
      const path = [...parentPath, key]
      results.push({
        key: path.join(':'),
        label: path.join(' > '),
      })
      flattenHierarchy(child, path, results)
    }
  }
  return results
}

// Level colors for visual hierarchy
const LEVEL_COLORS = [
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900' },
  { bg: 'bg-blue-50/50', border: 'border-blue-300', text: 'text-gray-800' },
  { bg: 'bg-indigo-50/50', border: 'border-indigo-300', text: 'text-gray-700' },
  { bg: 'bg-purple-50/50', border: 'border-purple-300', text: 'text-gray-700' },
  { bg: 'bg-pink-50/50', border: 'border-pink-300', text: 'text-gray-600' },
]

const LEVEL_LABELS = ['Main', 'Sub 1', 'Sub 2', 'Sub 3', 'Sub 4']

export default function CategoriesTab({ settings, setSettings }: CategoriesTabProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [newMainCategory, setNewMainCategory] = useState('')
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({})
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTemplateKey, setExpandedTemplateKey] = useState<string | null>(null)

  const currentHierarchy = settings.customCategories || INITIAL_CATEGORY_HIERARCHY
  const hiddenCategoryPaths = settings.hiddenCategoryPaths || {}

  // Build flattened paths for template mapping
  const flattenedPaths: { key: string; label: string }[] = []
  for (const [main, node] of Object.entries(currentHierarchy)) {
    flattenedPaths.push({ key: main, label: main })
    flattenHierarchy(node, [main], flattenedPaths)
  }

  const templateOptions = Object.entries(FIELD_TEMPLATES).map(([key, template]) => ({
    value: key,
    label: template.displayName || key,
  }))

  const getEffectiveTemplate = (pathKey: string) => {
    const override = settings.additionalInfoMappings?.[pathKey]
    if (override) return override
    if (CATEGORY_TEMPLATE_MAP[pathKey]) return CATEGORY_TEMPLATE_MAP[pathKey]
    const parts = pathKey.split(':')
    for (let i = parts.length - 1; i >= 1; i--) {
      const parentKey = parts.slice(0, i).join(':')
      if (settings.additionalInfoMappings?.[parentKey]) return settings.additionalInfoMappings[parentKey]
      if (CATEGORY_TEMPLATE_MAP[parentKey]) return CATEGORY_TEMPLATE_MAP[parentKey]
    }
    return ''
  }

  const handleTemplateChange = (pathKey: string, value: string) => {
    setSettings({
      ...settings,
      additionalInfoMappings: { ...settings.additionalInfoMappings, [pathKey]: value }
    })
  }

  const isHidden = (pathKey: string) => hiddenCategoryPaths[pathKey] === true

  const toggleHidden = (pathKey: string) => {
    const next = { ...hiddenCategoryPaths }
    if (isHidden(pathKey)) {
      delete next[pathKey]
    } else {
      next[pathKey] = true
    }
    setSettings({ ...settings, hiddenCategoryPaths: next })
  }

  const filteredPaths = flattenedPaths.filter(({ key, label }) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    const effective = getEffectiveTemplate(key)?.toLowerCase() || ''
    return label.toLowerCase().includes(term) || key.toLowerCase().includes(term) || effective.includes(term)
  })

  const toggleExpanded = (path: string) => {
    const next = new Set(expandedPaths)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    setExpandedPaths(next)
  }

  // Deep clone helper
  const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj))

  // Get node at path
  const getNodeAtPath = (hierarchy: typeof currentHierarchy, pathParts: string[]): CategoryNode | null => {
    if (pathParts.length === 0) return null
    let current: CategoryNode = hierarchy[pathParts[0]]
    for (let i = 1; i < pathParts.length; i++) {
      if (!current || isLeafArray(current)) return null
      current = current[pathParts[i]]
    }
    return current
  }

  // Set node at path
  const setNodeAtPath = (hierarchy: typeof currentHierarchy, pathParts: string[], value: CategoryNode) => {
    if (pathParts.length === 1) {
      hierarchy[pathParts[0]] = value
      return
    }
    let current: any = hierarchy[pathParts[0]]
    for (let i = 1; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }
    current[pathParts[pathParts.length - 1]] = value
  }

  // Add main category
  const addMainCategory = () => {
    if (!newMainCategory.trim()) return
    const hierarchy = deepClone(currentHierarchy)
    if (hierarchy[newMainCategory]) {
      toast.error('Category already exists')
      return
    }
    hierarchy[newMainCategory] = {}
    setSettings({ ...settings, customCategories: hierarchy })
    setNewMainCategory('')
  }

  // Add child at any level
  const addChildAtPath = (parentPath: string, newName: string, asLeaf: boolean = false) => {
    if (!newName.trim()) return
    
    const hierarchy = deepClone(currentHierarchy)
    const pathParts = parentPath.split(':')
    const parentNode = getNodeAtPath(hierarchy, pathParts)
    
    if (parentNode === null) return
    
    if (isLeafArray(parentNode)) {
      // Parent is a leaf array, add to it
      if (parentNode.includes(newName)) {
        toast.error('Item already exists')
        return
      }
      parentNode.push(newName)
      setNodeAtPath(hierarchy, pathParts, parentNode)
    } else {
      // Parent is an object, add new key
      if (parentNode[newName]) {
        toast.error('Item already exists')
      return
    }
      parentNode[newName] = asLeaf ? [] : {}
      setNodeAtPath(hierarchy, pathParts, parentNode)
    }
    
    setSettings({ ...settings, customCategories: hierarchy })
    setNewItemInputs({ ...newItemInputs, [parentPath]: '' })
  }

  // Convert leaf array item to object (to allow adding children)
  const convertToObject = (path: string) => {
    const hierarchy = deepClone(currentHierarchy)
    const pathParts = path.split(':')
    const itemName = pathParts[pathParts.length - 1]
    const parentPath = pathParts.slice(0, -1)
    
    if (parentPath.length === 0) return
    
    const parentNode = getNodeAtPath(hierarchy, parentPath)
    if (!parentNode || !isLeafArray(parentNode)) return
    
    // Remove from leaf array
    const newLeaves = parentNode.filter(l => l !== itemName)
    
    // Create new object structure
    const newParent: CategoryNode = {}
    for (const leaf of newLeaves) {
      (newParent as any)[leaf] = []
    }
    (newParent as any)[itemName] = {}
    
    setNodeAtPath(hierarchy, parentPath, newParent)
    setSettings({ ...settings, customCategories: hierarchy })
    toggleExpanded(path)
  }

  // Edit item
  const startEdit = (path: string, currentValue: string) => {
    setEditingPath(path)
    setEditingValue(currentValue)
  }

  const saveEdit = () => {
    if (!editingPath || !editingValue.trim()) {
      setEditingPath(null)
      setEditingValue('')
      return
    }

    const hierarchy = deepClone(currentHierarchy)
    const pathParts = editingPath.split(':')
    const oldName = pathParts[pathParts.length - 1]
    
    if (pathParts.length === 1) {
      // Editing main category
      if (hierarchy[editingValue] && editingValue !== oldName) {
        toast.error('Category already exists')
        return
      }
      const data = hierarchy[oldName]
      delete hierarchy[oldName]
      hierarchy[editingValue] = data
    } else {
      // Editing nested item
      const parentPath = pathParts.slice(0, -1)
      const parentNode = getNodeAtPath(hierarchy, parentPath)
      
      if (!parentNode) {
        // Parent node not found
        setEditingPath(null)
        setEditingValue('')
        return
      }
      
      if (isLeafArray(parentNode)) {
        // It's a leaf in an array
        const idx = parentNode.indexOf(oldName)
        if (idx >= 0) {
          if (parentNode.includes(editingValue) && editingValue !== oldName) {
            toast.error('Item already exists')
            return
          }
          parentNode[idx] = editingValue
          setNodeAtPath(hierarchy, parentPath, parentNode)
        }
      } else if (parentNode) {
        // It's a key in an object
        if (parentNode[editingValue] && editingValue !== oldName) {
          toast.error('Item already exists')
          return
        }
        const data = parentNode[oldName]
        delete parentNode[oldName]
        parentNode[editingValue] = data
        setNodeAtPath(hierarchy, parentPath, parentNode)
      }
    }
    
    setSettings({ ...settings, customCategories: hierarchy })
    setEditingPath(null)
    setEditingValue('')
  }

  // Recursive renderer for category tree
  const renderCategoryNode = (
    node: CategoryNode,
    path: string,
    level: number
  ): React.ReactElement[] => {
    const elements: React.ReactElement[] = []
    const colors = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)]
    const pathParts = path.split(':')
    const itemName = pathParts[pathParts.length - 1]
    const isExpanded = expandedPaths.has(path)
    const canAddMore = level < 4 // Max 5 levels (0-4)
    
    if (isLeafArray(node)) {
      // Render leaf items
      for (const leaf of node) {
        const leafPath = `${path}:${leaf}`
        const isLeafEditing = editingPath === leafPath
        
        elements.push(
          <div key={leafPath} className="flex items-center gap-1 py-0.5 group/item">
            {canAddMore && (
              <button
                onClick={() => convertToObject(leafPath)}
                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
                title="Add sub-items"
              >
                <AddIcon style={{ fontSize: 10 }} />
              </button>
            )}
            
            {isLeafEditing ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                onBlur={saveEdit}
                className="flex-1 px-1.5 py-0.5 text-[10px] border border-gray-300 rounded"
                autoFocus
              />
            ) : (
              <span className={`flex-1 text-[10px] ${colors.text} flex items-center gap-2`}>
                • {leaf}
                {isHidden(leafPath) && (
                  <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Hidden
                  </span>
                )}
              </span>
            )}
            
            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(leafPath, leaf)}
                className="px-1 py-0.5 text-blue-700"
                leftIcon={<EditIcon style={{ fontSize: 10 }} />}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleHidden(leafPath)}
                className="px-1 py-0.5 text-amber-700"
              >
                {isHidden(leafPath) ? 'Show' : 'Hide'}
              </Button>
            </div>
          </div>
        )
      }
      
      // Add new leaf input
      if (node.length > 0 || level > 0) {
        const inputKey = path
        elements.push(
          <div key={`${path}-add`} className="flex gap-1 mt-1">
            <input
              type="text"
              placeholder={`New ${LEVEL_LABELS[level + 1] || 'item'}...`}
              value={newItemInputs[inputKey] || ''}
              onChange={(e) => setNewItemInputs({ ...newItemInputs, [inputKey]: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addChildAtPath(path, newItemInputs[inputKey] || '', true)}
              className="flex-1 px-1.5 py-0.5 text-[10px] border border-gray-300 rounded"
            />
            <button
              onClick={() => addChildAtPath(path, newItemInputs[inputKey] || '', true)}
              className="px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded hover:bg-green-700"
            >
              <AddIcon style={{ fontSize: 10 }} />
            </button>
          </div>
        )
      }
    } else {
      // Render object keys (nested categories)
      const keys = Object.keys(node)
      
      for (const key of keys) {
        const keyPath = path ? `${path}:${key}` : key
        const childNode = node[key]
        const isKeyExpanded = expandedPaths.has(keyPath)
        const isKeyEditing = editingPath === keyPath
        const childCount = isLeafArray(childNode) 
          ? childNode.length 
          : Object.keys(childNode).length
        
        elements.push(
          <div key={keyPath} className={`border-l-2 ${colors.border} pl-2 my-1`}>
            <div className={`flex items-center gap-1.5 group/sub hover:${colors.bg} rounded transition-all py-0.5 px-1 -ml-1`}>
              <button
                onClick={() => toggleExpanded(keyPath)}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                {isKeyExpanded 
                  ? <KeyboardArrowDownIcon style={{ fontSize: 14 }} /> 
                  : <KeyboardArrowRightIcon style={{ fontSize: 14 }} />
                }
              </button>
              
              {isKeyEditing ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  onBlur={saveEdit}
                  className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                  autoFocus
                />
              ) : (
                <span className={`flex-1 font-medium ${colors.text} text-xs flex items-center gap-2`}>
                  {key}
                  <span className="text-[9px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded-full">
                    {childCount}
                  </span>
                  {isHidden(keyPath) && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Hidden
                    </span>
                  )}
                </span>
              )}
              
              <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(keyPath, key)}
                  className="px-1.5 py-0.5 text-blue-700"
                  leftIcon={<EditIcon style={{ fontSize: 12 }} />}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleHidden(keyPath)}
                  className="px-1.5 py-0.5 text-amber-700"
                >
                  {isHidden(keyPath) ? 'Show' : 'Hide'}
                </Button>
              </div>
            </div>
            
            {isKeyExpanded && (
              <div className="pl-4 space-y-0.5 mt-1">
                {canAddMore && !isLeafArray(childNode) && (
                  <div className="flex gap-1 mb-1 p-1 bg-white rounded border border-dashed border-gray-300">
                    <input
                      type="text"
                      placeholder={`New ${LEVEL_LABELS[level + 2] || 'item'}...`}
                      value={newItemInputs[keyPath] || ''}
                      onChange={(e) => setNewItemInputs({ ...newItemInputs, [keyPath]: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && addChildAtPath(keyPath, newItemInputs[keyPath] || '')}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    <button
                      onClick={() => addChildAtPath(keyPath, newItemInputs[keyPath] || '')}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <AddIcon style={{ fontSize: 12 }} /> Add
                    </button>
                  </div>
                )}
                {renderCategoryNode(childNode, keyPath, level + 1)}
              </div>
            )}
          </div>
        )
      }
      
      // Add new category input at this level
      if (keys.length === 0) {
        const inputKey = path
        elements.push(
          <div key={`${path}-add-empty`} className="flex gap-1 p-1 bg-white rounded border border-dashed border-gray-300">
            <input
              type="text"
              placeholder={`New ${LEVEL_LABELS[level + 1] || 'item'}...`}
              value={newItemInputs[inputKey] || ''}
              onChange={(e) => setNewItemInputs({ ...newItemInputs, [inputKey]: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addChildAtPath(path, newItemInputs[inputKey] || '')}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <button
              onClick={() => addChildAtPath(path, newItemInputs[inputKey] || '')}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              <AddIcon style={{ fontSize: 12 }} /> Add
            </button>
          </div>
        )
      }
    }
    
    return elements
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Category Hierarchy</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage up to 5 levels: Main &gt; Sub 1 &gt; Sub 2 &gt; Sub 3 &gt; Sub 4</p>
      </div>
      
      {/* Add Main Category */}
      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New main category..."
            value={newMainCategory}
            onChange={(e) => setNewMainCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addMainCategory()}
            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          />
          <button
            onClick={addMainCategory}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1 whitespace-nowrap"
          >
            <AddIcon style={{ fontSize: 14 }} />
            Add
          </button>
        </div>
      </div>

      {/* Additional Info Template Mapping */}
      <div className="mt-6 border border-blue-100 rounded-lg p-3 bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Additional Info Template Mapping</h3>
            <p className="text-xs text-blue-700">
              Map categories and subcategories to Información Adicional templates.
            </p>
          </div>
          <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
            {flattenedPaths.length} paths
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search path or template..."
            className="flex-1 px-3 py-1.5 text-xs border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[11px] px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-auto bg-white border border-blue-100 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-blue-50 text-blue-900">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Category Path</th>
                <th className="px-3 py-2 text-left font-semibold">Template</th>
                <th className="px-3 py-2 text-left font-semibold w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredPaths.map(({ key, label }) => {
                const effective = getEffectiveTemplate(key)
                return (
                  <>
                    <tr key={key} className="hover:bg-blue-50/50">
                      <td className="px-3 py-2 text-gray-800">{label}</td>
                      <td className="px-3 py-2">
                        <select
                          value={settings.additionalInfoMappings?.[key] || effective || ''}
                          onChange={(e) => handleTemplateChange(key, e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Default (from code)</option>
                          {templateOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                              {effective === opt.value ? ' (current)' : ''}
                            </option>
                          ))}
                        </select>
                        {effective ? (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Effective: {effective}
                            {settings.additionalInfoMappings?.[key] ? ' (override)' : ' (default)'}
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-600 mt-1">No template mapped</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setExpandedTemplateKey(expandedTemplateKey === key ? null : key)}
                          className="text-[11px] px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          {expandedTemplateKey === key ? 'Hide' : 'View'} template
                        </button>
                      </td>
                    </tr>
                    {expandedTemplateKey === key && effective && FIELD_TEMPLATES[effective] && (
                      <tr key={`${key}-template`}>
                        <td colSpan={3} className="px-4 py-3 bg-blue-50">
                          <div className="text-[11px] text-gray-800 space-y-1">
                            <div className="font-semibold text-blue-900">Fields ({FIELD_TEMPLATES[effective].fields.length})</div>
                            <div className="grid md:grid-cols-2 gap-1.5">
                              {FIELD_TEMPLATES[effective].fields.map(f => (
                                <div key={f.name} className="px-2 py-1 bg-white border border-blue-100 rounded">
                                  <div className="font-medium text-gray-900 text-[11px]">{f.label}</div>
                                  <div className="text-[10px] text-gray-500">{f.type}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filteredPaths.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-gray-500 text-xs">
                    No categories match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Tree */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-700">Structure</h3>
          <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
            {Object.keys(currentHierarchy).length} {Object.keys(currentHierarchy).length === 1 ? 'category' : 'categories'}
          </span>
        </div>
        
        {Object.keys(currentHierarchy).map((main: string) => {
          const isExpanded = expandedPaths.has(main)
          const isEditing = editingPath === main
          const node = currentHierarchy[main]
          const childCount = isLeafArray(node) ? node.length : Object.keys(node).length
          
          return (
          <div key={main} className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all">
            {/* Main Category */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 group hover:bg-blue-50 transition-all">
              <button
                  onClick={() => toggleExpanded(main)}
                className="p-1 hover:bg-white rounded transition-all"
              >
                  {isExpanded 
                    ? <KeyboardArrowDownIcon style={{ fontSize: 16 }} className="text-blue-600" /> 
                    : <KeyboardArrowRightIcon style={{ fontSize: 16 }} className="text-gray-600" />
                }
              </button>
              
                {isEditing ? (
                <input
                  type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    onBlur={saveEdit}
                  className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <>
                    <span className="flex-1 font-semibold text-gray-900 text-sm flex items-center gap-2">
                      {main}
                      {isHidden(main) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Hidden
                        </span>
                      )}
                    </span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                      {childCount} sub
                  </span>
                </>
              )}
              
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(main, main)
                    }}
                    className="px-2 py-1 text-blue-700"
                    leftIcon={<EditIcon style={{ fontSize: 14 }} />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleHidden(main)
                    }}
                    className="px-2 py-1 text-amber-700"
                  >
                    {isHidden(main) ? 'Show' : 'Hide'}
                  </Button>
              </div>
            </div>

            {/* Subcategories */}
              {isExpanded && (
              <div className="p-2 pl-8 space-y-1.5 bg-gray-50">
                  {/* Add Sub 1 */}
                <div className="flex gap-1.5 mb-2 p-1.5 bg-white rounded border border-dashed border-gray-300">
                  <input
                    type="text"
                      placeholder="New Sub 1..."
                      value={newItemInputs[main] || ''}
                      onChange={(e) => setNewItemInputs({ ...newItemInputs, [main]: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && addChildAtPath(main, newItemInputs[main] || '')}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                      onClick={() => addChildAtPath(main, newItemInputs[main] || '')}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium flex items-center gap-0.5"
                  >
                    <AddIcon style={{ fontSize: 12 }} />
                    Add
                  </button>
                </div>

                  {renderCategoryNode(node, main, 0)}
                  
                  {childCount === 0 && (
                  <div className="text-xs text-gray-500 italic pl-2">No subcategories yet</div>
                )}
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
