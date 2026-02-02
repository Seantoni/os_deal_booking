'use client'

import { useState, useEffect } from 'react'
import {
  getAllowedEmails,
  addAllowedEmail,
  revokeAccess,
  reactivateAccess,
  getAccessAuditLogs,
  inviteUser,
  resendInvitation,
} from '@/app/actions/access-control'
import { getAllUserProfiles, updateUserRole, previewUserSync, applyUserSync, type SyncPreview } from '@/app/actions/users'
import type { UserRole } from '@/lib/constants'
import { USER_ROLE_OPTIONS } from '@/lib/constants'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatShortDate } from '@/lib/date'

// Types for access control
type AllowedEmail = {
  id: string
  email: string
  isActive: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: string
  invitedRole: string | null
  invitationStatus: string | null
  invitedAt: Date | null
  invitedBy: string | null
  clerkInvitationId: string | null
  auditLogs: AccessAuditLog[]
}
type AccessAuditLog = {
  id: string
  email: string
  action: string
  performedBy: string
  notes: string | null
  performedAt: Date
  allowedEmailId: string | null
  allowedEmail?: { id: string; email: string; isActive: boolean } | null
}
type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import SearchIcon from '@mui/icons-material/Search'
import HistoryIcon from '@mui/icons-material/History'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PersonIcon from '@mui/icons-material/Person'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import MailIcon from '@mui/icons-material/Mail'
import PendingIcon from '@mui/icons-material/Pending'
import SyncIcon from '@mui/icons-material/Sync'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import ReplayIcon from '@mui/icons-material/Replay'
import KeyIcon from '@mui/icons-material/Key'
import { Button, Alert, Select, Input, Textarea } from '@/components/ui'
import EntityAccessSection from './EntityAccessSection'

type AccessAuditLogWithEmail = AccessAuditLog

export default function AccessManagementTab() {
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newEmailNotes, setNewEmailNotes] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('sales')
  const [inviteNotes, setInviteNotes] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AccessAuditLogWithEmail[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'revoked'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('sales')
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null)
  const [loadingSyncPreview, setLoadingSyncPreview] = useState(false)
  const [applyingSync, setApplyingSync] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const emailsPerPage = 50

  // Load allowed emails and user profiles on mount
  useEffect(() => {
    loadAllowedEmails()
    loadUserProfiles()
  }, [])

  async function loadAllowedEmails() {
    try {
      setLoading(true)
      setError(null)
      const result = await getAllowedEmails()
      if (result.success && result.data) {
        setAllowedEmails(result.data)
      } else {
        setError(result.error || 'Error al cargar los correos permitidos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los correos permitidos')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserProfiles() {
    try {
      setLoadingUsers(true)
      setError(null)
      const result = await getAllUserProfiles()
      if (result.success && result.data) {
        setUserProfiles(result.data)
      } else {
        setError(result.error || 'Error al cargar los perfiles de usuario')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los perfiles de usuario')
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleUpdateUserRole(clerkId: string) {
    try {
      setError(null)
      setSuccess(null)
      const result = await updateUserRole(clerkId, editingRole)
      
      if (result.success) {
        setSuccess('Rol de usuario actualizado exitosamente')
        setEditingUserId(null)
        await loadUserProfiles()
      } else {
        setError(result.error || 'Error al actualizar el rol de usuario')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el rol de usuario')
    }
  }

  function handleStartEdit(user: UserProfile) {
    setEditingUserId(user.clerkId)
    setEditingRole(user.role as UserRole)
  }

  function handleCancelEdit() {
    setEditingUserId(null)
    setEditingRole('sales')
  }

  async function handlePreviewSync() {
    try {
      setLoadingSyncPreview(true)
      setError(null)
      const result = await previewUserSync()
      if (result.success && result.data) {
        setSyncPreview(result.data)
      } else {
        setError(result.error || 'Error al obtener vista previa de sincronización')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener vista previa de sincronización')
    } finally {
      setLoadingSyncPreview(false)
    }
  }

  async function handleApplySync() {
    try {
      setApplyingSync(true)
      setError(null)
      const result = await applyUserSync()
      if (result.success && result.data) {
        const { created, updated, deactivated, reactivated } = result.data
        const messages = []
        if (created > 0) messages.push(`${created} creados`)
        if (updated > 0) messages.push(`${updated} actualizados`)
        if (deactivated > 0) messages.push(`${deactivated} desactivados`)
        if (reactivated > 0) messages.push(`${reactivated} reactivados`)
        
        if (messages.length > 0) {
          toast.success(`Sincronización completada: ${messages.join(', ')}`)
        } else {
          toast.success('Sincronización completada: sin cambios')
        }
        
        setSyncPreview(null)
        await loadUserProfiles()
      } else {
        setError(result.error || 'Error al aplicar sincronización')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar sincronización')
    } finally {
      setApplyingSync(false)
    }
  }

  function handleCancelSync() {
    setSyncPreview(null)
  }

  async function handleAddEmail() {
    if (!newEmail.trim()) {
      setError('Por favor ingrese una dirección de correo')
      return
    }

    try {
      setError(null)
      setSuccess(null)
      const result = await addAllowedEmail(newEmail.trim(), newEmailNotes.trim() || undefined)
      
      if (result.success) {
        const action = 'action' in result ? result.action : 'granted'
        toast.success(`Correo ${action === 'reactivated' ? 'reactivado' : 'agregado'} exitosamente`)
        setNewEmail('')
        setNewEmailNotes('')
        setShowAddForm(false)
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al agregar el correo'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  async function handleInviteUser() {
    if (!inviteFirstName.trim() || !inviteLastName.trim()) {
      setError('Por favor ingrese el nombre y apellido')
      toast.error('Por favor ingrese el nombre y apellido')
      return
    }
    if (!inviteEmail.trim()) {
      setError('Por favor ingrese una dirección de correo')
      toast.error('Por favor ingrese una dirección de correo')
      return
    }

    try {
      setInviting(true)
      setError(null)
      setSuccess(null)
      const result = await inviteUser(inviteEmail.trim(), inviteRole, {
        notes: inviteNotes.trim() || undefined,
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
      })
      
      if (result.success) {
        toast.success(`Invitación enviada exitosamente a ${inviteEmail.trim()}`)
        setInviteEmail('')
        setInviteFirstName('')
        setInviteLastName('')
        setInviteRole('sales')
        setInviteNotes('')
        setShowInviteForm(false)
        await loadAllowedEmails()
      } else {
        // Handle error response from server action
        const errorMessage = result.error || 'Error al enviar la invitación'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (err) {
      // Fallback for unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar la invitación'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setInviting(false)
    }
  }

  async function handleResendInvitation(email: string) {
    try {
      setResendingEmail(email)
      setError(null)
      const result = await resendInvitation(email)
      
      if (result.success) {
        toast.success(`Invitación reenviada exitosamente a ${email}`)
        await loadAllowedEmails()
      } else {
        setError(result.error || 'Error al reenviar la invitación')
        toast.error(result.error || 'Error al reenviar la invitación')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al reenviar la invitación'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setResendingEmail(null)
    }
  }

  const confirmDialog = useConfirmDialog()

  async function handleRevokeAccess(email: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Revocar Acceso',
      message: `¿Está seguro de que desea revocar el acceso para ${email}? Esta acción no se puede deshacer.`,
      confirmText: 'Revocar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    try {
      setError(null)
      setSuccess(null)
      const result = await revokeAccess(email)
      if (result.success) {
        toast.success('Acceso revocado exitosamente')
        setSuccess('Acceso revocado exitosamente')
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al revocar el acceso'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error revoking access:', err)
    }
  }

  async function handleReactivateAccess(email: string) {
    try {
      setError(null)
      setSuccess(null)
      const result = await reactivateAccess(email)
      if (result.success) {
        toast.success('Acceso reactivado exitosamente')
        setSuccess('Acceso reactivado exitosamente')
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al reactivar el acceso'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error reactivating access:', err)
    }
  }

  async function loadAuditLogs() {
    try {
      setLoadingAuditLogs(true)
      const result = await getAccessAuditLogs()
      if (result.success && result.data) {
        setAuditLogs(result.data)
      } else {
        setError(result.error || 'Error al cargar los registros de auditoría')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los registros de auditoría')
    } finally {
      setLoadingAuditLogs(false)
    }
  }

  // Filter emails based on search and status
  const filteredEmails = allowedEmails.filter((email) => {
    const matchesSearch = email.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && email.isActive) ||
      (filterStatus === 'revoked' && !email.isActive)
    return matchesSearch && matchesStatus
  })

  // Filter users based on search
  const filteredUsers = userProfiles.filter((user) => {
    const searchLower = userSearchQuery.toLowerCase()
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    )
  })

  // Pagination
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage)
  const paginatedEmails = filteredEmails.slice(
    (currentPage - 1) * emailsPerPage,
    currentPage * emailsPerPage
  )

  // Clear success/error messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'editor':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ere':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'sales':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Access Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage user access and roles</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setShowAddForm(true)
              setShowInviteForm(false)
            }}
            leftIcon={<AddIcon fontSize="small" />}
          >
            Agregar Correo
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setShowInviteForm(true)
              setShowAddForm(false)
            }}
            leftIcon={<MailIcon fontSize="small" />}
          >
            Invitar Usuario
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Add Email Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Correo a la Lista de Permitidos</h3>
          <p className="text-sm text-gray-600 mb-4">Agregue un correo a la lista de permitidos sin enviar una invitación.</p>
          <div className="space-y-4">
            <Input
              type="email"
              label="Dirección de Correo *"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <Textarea
              label="Notas (Opcional)"
              value={newEmailNotes}
              onChange={(e) => setNewEmailNotes(e.target.value)}
              placeholder="Notas opcionales sobre esta concesión de acceso..."
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={handleAddEmail}>Agregar Correo</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false)
                  setNewEmail('')
                  setNewEmailNotes('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Form */}
      {showInviteForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite User</h3>
          <p className="text-sm text-gray-600 mb-4">Envíe un correo de invitación a través de Clerk. El usuario recibirá un enlace de registro e instrucciones.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="Nombre *"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
                placeholder="Juan"
              />
              <Input
                type="text"
                label="Apellido *"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
                placeholder="Pérez"
              />
            </div>
            <Input
              type="email"
              label="Dirección de Correo *"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <div>
              <Select
                label="Role *"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                options={USER_ROLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
              <p className="text-xs text-gray-500 mt-1">Este rol se asignará cuando el usuario acepte la invitación.</p>
            </div>
            <Textarea
              label="Notas (Opcional)"
              value={inviteNotes}
              onChange={(e) => setInviteNotes(e.target.value)}
              placeholder="Notas opcionales sobre esta invitación..."
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={handleInviteUser} disabled={inviting} loading={inviting}>
                Enviar Invitación
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowInviteForm(false)
                  setInviteEmail('')
                  setInviteFirstName('')
                  setInviteLastName('')
                  setInviteRole('sales')
                  setInviteNotes('')
                }}
                disabled={inviting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              placeholder="Buscar por correo..."
              leftIcon={<SearchIcon className="text-gray-400" />}
              fullWidth={false}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as 'all' | 'active' | 'revoked')
              setCurrentPage(1) // Reset to first page on filter change
            }}
            options={[
              { value: 'all', label: 'Todos los Estados' },
              { value: 'active', label: 'Activo' },
              { value: 'revoked', label: 'Revocado' },
            ]}
            fullWidth={false}
          />
          <button
            onClick={async () => {
              setShowAuditLogs(!showAuditLogs)
              if (!showAuditLogs && auditLogs.length === 0) {
                await loadAuditLogs()
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showAuditLogs
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <HistoryIcon fontSize="small" />
            <span>Registro de Auditoría</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Section */}
      {showAuditLogs && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registro de Auditoría</h3>
          {loadingAuditLogs ? (
            <div className="text-center py-8 text-gray-500">Cargando registros de auditoría...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No se encontraron registros de auditoría</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Correo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Acción</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Realizado Por</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{log.email}</td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.action === 'granted'
                              ? 'bg-green-100 text-green-800'
                              : log.action === 'revoked'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {log.action === 'granted' ? 'Concedido' : log.action === 'revoked' ? 'Revocado' : log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{log.performedBy}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(log.performedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{log.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Allowed Emails Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando correos permitidos...</div>
        ) : paginatedEmails.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || filterStatus !== 'all'
              ? 'No hay correos que coincidan con sus criterios de búsqueda'
              : 'No se encontraron correos permitidos. Haga clic en "Agregar Correo" para comenzar.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Correo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estado de Acceso</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invitación</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Creado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notas</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{email.email}</td>
                      <td className="py-3 px-4 text-sm">
                        {email.isActive ? (
                          <span className="flex items-center gap-1 text-green-700">
                            <CheckCircleIcon fontSize="small" />
                            <span>Activo</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700">
                            <CancelIcon fontSize="small" />
                            <span>Revocado</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {email.invitationStatus ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                email.invitationStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : email.invitationStatus === 'accepted'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {email.invitationStatus === 'pending' && <PendingIcon fontSize="small" />}
                              {email.invitationStatus === 'accepted' && <CheckCircleIcon fontSize="small" />}
                              <span>{email.invitationStatus === 'pending' ? 'Pendiente' : email.invitationStatus === 'accepted' ? 'Aceptado' : email.invitationStatus}</span>
                            </span>
                            {email.invitedRole && (
                              <span className="text-xs text-gray-500">Rol: {email.invitedRole}</span>
                            )}
                            {email.invitedAt && (
                              <span className="text-xs text-gray-500">
                                Enviado: {formatShortDate(email.invitedAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin invitación</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatShortDate(email.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{email.notes || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {email.invitationStatus === 'pending' && (
                            <button
                              onClick={() => handleResendInvitation(email.email)}
                              disabled={resendingEmail === email.email}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reenviar Invitación"
                            >
                              {resendingEmail === email.email ? (
                                <SyncIcon fontSize="small" className="animate-spin" />
                              ) : (
                                <ReplayIcon fontSize="small" />
                              )}
                            </button>
                          )}
                          {email.isActive ? (
                            <button
                              onClick={() => handleRevokeAccess(email.email)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Revocar Acceso"
                            >
                              <DeleteIcon fontSize="small" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateAccess(email.email)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Reactivar Acceso"
                            >
                              <RestoreIcon fontSize="small" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {(currentPage - 1) * emailsPerPage + 1} a{' '}
                  {Math.min(currentPage * emailsPerPage, filteredEmails.length)} de{' '}
                  {filteredEmails.length} correos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Profiles Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">User Profiles</h3>
            <p className="text-sm text-gray-600 mt-1">Manage user roles and permissions</p>
          </div>
          <Button
            onClick={handlePreviewSync}
            variant="secondary"
            size="sm"
            leftIcon={<SyncIcon style={{ fontSize: 16 }} />}
            disabled={loadingSyncPreview}
          >
            {loadingSyncPreview ? 'Cargando...' : 'Sync desde Clerk'}
          </Button>
        </div>

        {/* Sync Preview Panel */}
        {syncPreview && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-blue-900">Vista previa de sincronización</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Los siguientes cambios se aplicarán al confirmar:
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApplySync}
                  size="sm"
                  disabled={applyingSync || (
                    syncPreview.toCreate.length === 0 && 
                    syncPreview.toUpdate.length === 0 && 
                    syncPreview.toDeactivate.length === 0 &&
                    syncPreview.toReactivate.length === 0
                  )}
                >
                  {applyingSync ? 'Aplicando...' : 'Aplicar cambios'}
                </Button>
                <Button
                  onClick={handleCancelSync}
                  variant="secondary"
                  size="sm"
                  disabled={applyingSync}
                >
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {/* To Create */}
              <div className="bg-green-100 rounded-lg p-3">
                <div className="font-semibold text-green-800 flex items-center gap-1">
                  <AddIcon style={{ fontSize: 16 }} />
                  Crear ({syncPreview.toCreate.length})
                </div>
                {syncPreview.toCreate.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-green-700 text-xs">
                    {syncPreview.toCreate.slice(0, 5).map((u) => (
                      <li key={u.clerkId} className="truncate">{u.email || u.name || u.clerkId}</li>
                    ))}
                    {syncPreview.toCreate.length > 5 && (
                      <li className="text-green-600">+{syncPreview.toCreate.length - 5} más</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-green-600 text-xs mt-1">Sin cambios</p>
                )}
              </div>

              {/* To Update */}
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="font-semibold text-blue-800 flex items-center gap-1">
                  <EditIcon style={{ fontSize: 16 }} />
                  Actualizar ({syncPreview.toUpdate.length})
                </div>
                {syncPreview.toUpdate.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-blue-700 text-xs">
                    {syncPreview.toUpdate.slice(0, 5).map((u) => (
                      <li key={u.clerkId} className="truncate" title={u.changes.join(', ')}>
                        {u.email || u.name || u.clerkId}
                      </li>
                    ))}
                    {syncPreview.toUpdate.length > 5 && (
                      <li className="text-blue-600">+{syncPreview.toUpdate.length - 5} más</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-blue-600 text-xs mt-1">Sin cambios</p>
                )}
              </div>

              {/* To Deactivate */}
              <div className="bg-red-100 rounded-lg p-3">
                <div className="font-semibold text-red-800 flex items-center gap-1">
                  <PersonOffIcon style={{ fontSize: 16 }} />
                  Desactivar ({syncPreview.toDeactivate.length})
                </div>
                {syncPreview.toDeactivate.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-red-700 text-xs">
                    {syncPreview.toDeactivate.slice(0, 5).map((u) => (
                      <li key={u.clerkId} className="truncate">{u.email || u.name || u.clerkId}</li>
                    ))}
                    {syncPreview.toDeactivate.length > 5 && (
                      <li className="text-red-600">+{syncPreview.toDeactivate.length - 5} más</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-red-600 text-xs mt-1">Sin cambios</p>
                )}
              </div>

              {/* To Reactivate */}
              <div className="bg-amber-100 rounded-lg p-3">
                <div className="font-semibold text-amber-800 flex items-center gap-1">
                  <RestoreIcon style={{ fontSize: 16 }} />
                  Reactivar ({syncPreview.toReactivate.length})
                </div>
                {syncPreview.toReactivate.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-amber-700 text-xs">
                    {syncPreview.toReactivate.slice(0, 5).map((u) => (
                      <li key={u.clerkId} className="truncate">{u.email || u.name || u.clerkId}</li>
                    ))}
                    {syncPreview.toReactivate.length > 5 && (
                      <li className="text-amber-600">+{syncPreview.toReactivate.length - 5} más</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-amber-600 text-xs mt-1">Sin cambios</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <Input
            type="text"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o rol..."
            leftIcon={<SearchIcon className="text-gray-400" />}
            fullWidth={false}
          />
        </div>

        {/* Users Table */}
        {loadingUsers ? (
          <div className="text-center py-12 text-gray-500">Cargando perfiles de usuario...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {userSearchQuery
              ? 'No hay usuarios que coincidan con sus criterios de búsqueda'
              : 'No se encontraron perfiles de usuario'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Nombre</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Correo</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Rol</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Estado</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Creado</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${!user.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                    <td className="py-3 px-6 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {user.isActive ? (
                          <PersonIcon className="text-gray-400" fontSize="small" />
                        ) : (
                          <PersonOffIcon className="text-red-400" fontSize="small" />
                        )}
                        <span className={`font-medium ${!user.isActive ? 'line-through text-gray-500' : ''}`}>
                          {user.name || 'N/A'}
                        </span>
                        {!user.isActive && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Inactivo</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">{user.email || 'N/A'}</td>
                    <td className="py-3 px-6 text-sm">
                      {editingUserId === user.clerkId ? (
                        <Select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as UserRole)}
                          options={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'sales', label: 'Sales' },
                            { value: 'editor', label: 'Editor' },
                            { value: 'ere', label: 'ERE' },
                          ]}
                          size="sm"
                          fullWidth={false}
                        />
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-sm">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircleIcon style={{ fontSize: 14 }} />
                          <span className="text-xs">Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <CancelIcon style={{ fontSize: 14 }} />
                          <span className="text-xs">Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {formatShortDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-6 text-sm text-right">
                      {editingUserId === user.clerkId ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateUserRole(user.clerkId)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Guardar"
                          >
                            <SaveIcon fontSize="small" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Cancelar"
                          >
                            <CloseIcon fontSize="small" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar Rol"
                        >
                          <EditIcon fontSize="small" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entity Access Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <KeyIcon className="text-indigo-600" style={{ fontSize: 20 }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Acceso por Entidad</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                Otorgar acceso específico a elementos individuales sin cambiar roles
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <EntityAccessSection />
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

