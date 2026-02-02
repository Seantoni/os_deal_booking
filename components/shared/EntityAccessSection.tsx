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

import { Button, Select, Input, Alert } from '@/components/ui'

type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string
  isActive: boolean
}

const ENTITY_TYPES: { value: EntityType; label: string; icon: React.ReactNode }[] = [
  { value: 'business', label: 'Negocios', icon: <BusinessIcon style={{ fontSize: 16 }} /> },
  { value: 'opportunity', label: 'Oportunidades', icon: <HandshakeIcon style={{ fontSize: 16 }} /> },
  { value: 'deal', label: 'Deals', icon: <ReceiptIcon style={{ fontSize: 16 }} /> },
  { value: 'eventLead', label: 'Event Leads', icon: <EventIcon style={{ fontSize: 16 }} /> },
  { value: 'bookingRequest', label: 'Solicitudes', icon: <DescriptionIcon style={{ fontSize: 16 }} /> },
]

const ACCESS_LEVELS: { value: AccessLevel; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'view', label: 'Ver', icon: <VisibilityIcon style={{ fontSize: 14 }} />, description: 'Solo lectura' },
  { value: 'edit', label: 'Editar', icon: <EditIcon style={{ fontSize: 14 }} />, description: 'Ver y modificar' },
  { value: 'manage', label: 'Gestionar', icon: <AdminPanelSettingsIcon style={{ fontSize: 14 }} />, description: 'Control total' },
]

export default function EntityAccessSection() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userAccessList, setUserAccessList] = useState<EntityAccessRecord[]>([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  
  // Grant form state
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [grantEntityType, setGrantEntityType] = useState<EntityType>('business')
  const [grantEntityId, setGrantEntityId] = useState('')
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

  async function handleGrantAccess() {
    if (!selectedUserId) {
      toast.error('Seleccione un usuario')
      return
    }
    if (!grantEntityId.trim()) {
      toast.error('Ingrese el ID de la entidad')
      return
    }

    try {
      setGranting(true)
      setError(null)
      
      const result = await grantEntityAccess(
        selectedUserId,
        grantEntityType,
        grantEntityId.trim(),
        grantAccessLevel,
        { notes: grantNotes.trim() || undefined }
      )
      
      if (result.success) {
        toast.success('Acceso otorgado exitosamente')
        setGrantEntityId('')
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Entidad
              </label>
              <Select
                value={grantEntityType}
                onChange={(e) => setGrantEntityType(e.target.value as EntityType)}
                options={ENTITY_TYPES.map(t => ({ value: t.value, label: t.label }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de Entidad
              </label>
              <Input
                type="text"
                value={grantEntityId}
                onChange={(e) => setGrantEntityId(e.target.value)}
                placeholder="cuid o ID"
              />
            </div>
            
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
          
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleGrantAccess}
              disabled={granting || !grantEntityId.trim()}
              loading={granting}
            >
              Otorgar Acceso
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
              {userAccessList.length} acceso(s) otorgado(s)
            </p>
          </div>
          
          {loadingAccess ? (
            <div className="p-8 text-center text-gray-500">
              Cargando accesos...
            </div>
          ) : userAccessList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Este usuario no tiene accesos especiales a entidades.
              <br />
              <span className="text-xs">Los accesos por rol o asignación no se muestran aquí.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Tipo</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">ID Entidad</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Nivel</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Otorgado</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Notas</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userAccessList.map((access) => (
                    <tr key={access.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          {getEntityTypeIcon(access.entityType as EntityType)}
                          {getEntityTypeLabel(access.entityType as EntityType)}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {access.entityId}
                        </code>
                      </td>
                      <td className="py-2 px-4">
                        {getAccessLevelBadge(access.accessLevel as AccessLevel)}
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-500">
                        {formatShortDate(access.grantedAt)}
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-500 max-w-[150px] truncate" title={access.notes || ''}>
                        {access.notes || '-'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => handleRevokeAccess(access)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Revocar Acceso"
                        >
                          <DeleteIcon style={{ fontSize: 16 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
