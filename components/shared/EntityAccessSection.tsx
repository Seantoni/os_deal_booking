'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  grantEntityAccess,
  revokeEntityAccess,
  getUserEntityAccess,
  type EntityType,
  type AccessLevel,
  type EntityAccessRecord,
} from '@/app/actions/access-control'
import { getAllUserProfiles } from '@/app/actions/users'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatShortDate } from '@/lib/date'

import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import BusinessIcon from '@mui/icons-material/Business'
import HandshakeIcon from '@mui/icons-material/Handshake'
import ReceiptIcon from '@mui/icons-material/Receipt'
import EventIcon from '@mui/icons-material/Event'
import DescriptionIcon from '@mui/icons-material/Description'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'

import { Button, Select, Input, Alert } from '@/components/ui'

type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string
  isActive: boolean
}

const ENTITY_TYPES: { value: EntityType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'business', label: 'Negocios', icon: <BusinessIcon style={{ fontSize: 16 }} />, description: 'Acceso a todos los negocios' },
  { value: 'opportunity', label: 'Oportunidades', icon: <HandshakeIcon style={{ fontSize: 16 }} />, description: 'Acceso a todas las oportunidades' },
  { value: 'deal', label: 'Deals', icon: <ReceiptIcon style={{ fontSize: 16 }} />, description: 'Acceso a todos los deals' },
  { value: 'lead', label: 'Leads', icon: <PersonSearchIcon style={{ fontSize: 16 }} />, description: 'Acceso a todos los leads (CRM)' },
  { value: 'eventLead', label: 'Leads Negocios', icon: <EventIcon style={{ fontSize: 16 }} />, description: 'Acceso a todos los leads de eventos' },
  { value: 'bookingRequest', label: 'Solicitudes', icon: <DescriptionIcon style={{ fontSize: 16 }} />, description: 'Acceso a todas las solicitudes' },
]

const ACCESS_LEVELS: { value: AccessLevel; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'view', label: 'Ver', icon: <VisibilityIcon style={{ fontSize: 14 }} />, description: 'Solo lectura' },
  { value: 'edit', label: 'Editar', icon: <EditIcon style={{ fontSize: 14 }} />, description: 'Ver y modificar' },
  { value: 'manage', label: 'Gestionar', icon: <AdminPanelSettingsIcon style={{ fontSize: 14 }} />, description: 'Control total' },
]

// Special entity ID to indicate "all" access to the entity type
const ALL_ENTITIES_ID = '__ALL__'

export default function EntityAccessSection() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userAccessList, setUserAccessList] = useState<EntityAccessRecord[]>([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  
  // Grant form state
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [grantEntityType, setGrantEntityType] = useState<EntityType>('business')
  const [grantAccessLevel, setGrantAccessLevel] = useState<AccessLevel>('view')
  const [grantNotes, setGrantNotes] = useState('')
  const [granting, setGranting] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const confirmDialog = useConfirmDialog()

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const result = await getAllUserProfiles()
      if (result.success && result.data) {
        setUsers(result.data.filter((u: UserProfile) => u.isActive))
      }
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserAccess = useCallback(async (userId: string) => {
    if (!userId) {
      setUserAccessList([])
      return
    }
    
    try {
      setLoadingAccess(true)
      const result = await getUserEntityAccess(userId)
      if (result.success && result.data) {
        setUserAccessList(result.data)
      } else {
        setError(result.error || 'Error al cargar accesos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar accesos')
    } finally {
      setLoadingAccess(false)
    }
  }, [])

  // Load access when user changes
  useEffect(() => {
    if (selectedUserId) {
      loadUserAccess(selectedUserId)
    } else {
      setUserAccessList([])
    }
  }, [selectedUserId, loadUserAccess])

  // Check if user already has access to a specific entity type
  function hasAccessToType(entityType: EntityType): boolean {
    return userAccessList.some(a => a.entityType === entityType && a.entityId === ALL_ENTITIES_ID)
  }

  async function handleGrantAccess() {
    if (!selectedUserId) {
      toast.error('Seleccione un usuario')
      return
    }

    // Check if already has access
    if (hasAccessToType(grantEntityType)) {
      toast.error(`El usuario ya tiene acceso a ${getEntityTypeLabel(grantEntityType)}`)
      return
    }

    try {
      setGranting(true)
      setError(null)
      
      const result = await grantEntityAccess(
        selectedUserId,
        grantEntityType,
        ALL_ENTITIES_ID, // Grant access to ALL entities of this type
        grantAccessLevel,
        { notes: grantNotes.trim() || undefined }
      )
      
      if (result.success) {
        toast.success(`Acceso a ${getEntityTypeLabel(grantEntityType)} otorgado`)
        setGrantNotes('')
        setShowGrantForm(false)
        await loadUserAccess(selectedUserId)
      } else {
        setError(result.error || 'Error al otorgar acceso')
        toast.error(result.error || 'Error al otorgar acceso')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al otorgar acceso'
      setError(msg)
      toast.error(msg)
    } finally {
      setGranting(false)
    }
  }

  async function handleRevokeAccess(access: EntityAccessRecord) {
    const confirmed = await confirmDialog.confirm({
      title: 'Revocar Acceso',
      message: `¿Está seguro de que desea revocar el acceso a ${getEntityTypeLabel(access.entityType as EntityType)} (${access.entityId})?`,
      confirmText: 'Revocar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    try {
      const result = await revokeEntityAccess(
        access.userId,
        access.entityType as EntityType,
        access.entityId
      )
      
      if (result.success) {
        toast.success('Acceso revocado')
        await loadUserAccess(selectedUserId)
      } else {
        toast.error(result.error || 'Error al revocar acceso')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al revocar acceso')
    }
  }

  function getEntityTypeLabel(type: EntityType): string {
    return ENTITY_TYPES.find(t => t.value === type)?.label || type
  }

  function getEntityTypeIcon(type: EntityType): React.ReactNode {
    return ENTITY_TYPES.find(t => t.value === type)?.icon || <BusinessIcon style={{ fontSize: 16 }} />
  }

  function getAccessLevelBadge(level: AccessLevel): React.ReactNode {
    const config = ACCESS_LEVELS.find(l => l.value === level)
    if (!config) return level
    
    const colorClass = {
      view: 'bg-gray-100 text-gray-700 border-gray-200',
      edit: 'bg-blue-100 text-blue-700 border-blue-200',
      manage: 'bg-purple-100 text-purple-700 border-purple-200',
    }[level]
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
        {config.icon}
        {config.label}
      </span>
    )
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Acceso a Entidades</h3>
          <p className="text-sm text-gray-600 mt-1">
            Otorgar acceso a usuarios específicos a entidades individuales (negocios, oportunidades, etc.)
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* User Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Usuario
            </label>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={[
                { value: '', label: '-- Seleccione un usuario --' },
                ...users.map(u => ({
                  value: u.id,
                  label: `${u.name || 'Sin nombre'} (${u.email || u.clerkId}) - ${u.role}`,
                })),
              ]}
              disabled={loading}
            />
          </div>
          
          {selectedUserId && (
            <Button
              onClick={() => setShowGrantForm(!showGrantForm)}
              leftIcon={showGrantForm ? <CloseIcon style={{ fontSize: 16 }} /> : <AddIcon style={{ fontSize: 16 }} />}
              variant={showGrantForm ? 'secondary' : 'primary'}
              size="sm"
            >
              {showGrantForm ? 'Cancelar' : 'Otorgar Acceso'}
            </Button>
          )}
        </div>
      </div>

      {/* Grant Access Form */}
      {showGrantForm && selectedUserId && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="font-medium text-blue-900 mb-3">
            Otorgar acceso a: {selectedUser?.name || selectedUser?.email}
          </h4>
          
          {/* Entity Type Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {ENTITY_TYPES.map((type) => {
              const alreadyHasAccess = hasAccessToType(type.value)
              const isSelected = grantEntityType === type.value
              
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => !alreadyHasAccess && setGrantEntityType(type.value)}
                  disabled={alreadyHasAccess}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    alreadyHasAccess
                      ? 'bg-green-50 border-green-300 cursor-not-allowed'
                      : isSelected
                        ? 'bg-white border-blue-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={alreadyHasAccess ? 'text-green-600' : isSelected ? 'text-blue-600' : 'text-gray-500'}>
                      {type.icon}
                    </span>
                    <span className={`font-medium text-sm ${alreadyHasAccess ? 'text-green-700' : 'text-gray-900'}`}>
                      {type.label}
                    </span>
                    {alreadyHasAccess && (
                      <CheckCircleIcon className="ml-auto text-green-500" style={{ fontSize: 16 }} />
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${alreadyHasAccess ? 'text-green-600' : 'text-gray-500'}`}>
                    {alreadyHasAccess ? 'Ya tiene acceso' : type.description}
                  </p>
                </button>
              )
            })}
          </div>
          
          {/* Access Level and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel de Acceso
              </label>
              <Select
                value={grantAccessLevel}
                onChange={(e) => setGrantAccessLevel(e.target.value as AccessLevel)}
                options={ACCESS_LEVELS.map(l => ({ 
                  value: l.value, 
                  label: `${l.label} - ${l.description}` 
                }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <Input
                type="text"
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="Razón del acceso"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowGrantForm(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={granting || hasAccessToType(grantEntityType)}
              loading={granting}
            >
              Otorgar Acceso a {getEntityTypeLabel(grantEntityType)}
            </Button>
          </div>
        </div>
      )}

      {/* User Access List */}
      {selectedUserId && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">
              Accesos de {selectedUser?.name || selectedUser?.email}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {userAccessList.length} módulo(s) con acceso
            </p>
          </div>
          
          {loadingAccess ? (
            <div className="p-8 text-center text-gray-500">
              Cargando accesos...
            </div>
          ) : userAccessList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Este usuario no tiene accesos especiales a módulos.
              <br />
              <span className="text-xs">Los accesos por rol no se muestran aquí.</span>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userAccessList.map((access) => (
                <div 
                  key={access.id} 
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">
                        {getEntityTypeIcon(access.entityType as EntityType)}
                      </span>
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {getEntityTypeLabel(access.entityType as EntityType)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Todos los registros
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(access)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Revocar Acceso"
                    >
                      <DeleteIcon style={{ fontSize: 14 }} />
                    </button>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    {getAccessLevelBadge(access.accessLevel as AccessLevel)}
                    <span className="text-xs text-gray-400">
                      {formatShortDate(access.grantedAt)}
                    </span>
                  </div>
                  
                  {access.notes && (
                    <div className="mt-2 text-xs text-gray-500 truncate" title={access.notes}>
                      {access.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help text when no user selected */}
      {!selectedUserId && !loading && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <SearchIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 32 }} />
          <p className="text-gray-600">
            Seleccione un usuario para ver y gestionar sus accesos a entidades específicas.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Esto permite dar acceso a un usuario a elementos específicos sin cambiar su rol.
          </p>
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
