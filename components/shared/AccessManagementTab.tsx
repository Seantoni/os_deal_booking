'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getAllowedEmails,
  addAllowedEmail,
  revokeAccess,
  reactivateAccess,
  getAccessAuditLogs,
  inviteUser,
  resendInvitation,
} from '@/app/actions/access-control'
import { getAllUserProfiles, updateUserRole, deleteUserProfile, previewUserSync, applyUserSync, type SyncPreview } from '@/app/actions/users'
import type { UserRole } from '@/lib/constants'
import { USER_ROLE_OPTIONS } from '@/lib/constants'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatShortDate } from '@/lib/date'

// Icons
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
import GroupIcon from '@mui/icons-material/Group'
import EmailIcon from '@mui/icons-material/Email'

import { Button, Alert, Select, Input, Textarea } from '@/components/ui'
import EntityAccessSection from './EntityAccessSection'

// Types
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

type TabId = 'emails' | 'users' | 'entity-access' | 'audit'

// Tab configuration
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'emails', label: 'Correos', icon: <EmailIcon style={{ fontSize: 18 }} /> },
  { id: 'users', label: 'Usuarios', icon: <GroupIcon style={{ fontSize: 18 }} /> },
  { id: 'entity-access', label: 'Acceso por Entidad', icon: <KeyIcon style={{ fontSize: 18 }} /> },
  { id: 'audit', label: 'Auditoría', icon: <HistoryIcon style={{ fontSize: 18 }} /> },
]

// Role badge colors
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  editor: 'bg-blue-100 text-blue-700',
  ere: 'bg-cyan-100 text-cyan-700',
  sales: 'bg-gray-100 text-gray-700',
}

export default function AccessManagementTab() {
  const [activeTab, setActiveTab] = useState<TabId>('emails')
  
  // Allowed Emails state
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'revoked'>('all')
  
  // User Profiles state
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('sales')
  
  // Sync state
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null)
  const [loadingSyncPreview, setLoadingSyncPreview] = useState(false)
  const [applyingSync, setApplyingSync] = useState(false)
  
  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AccessAuditLog[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  
  // Modal state
  const [modalType, setModalType] = useState<'add-email' | 'invite' | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [newEmailNotes, setNewEmailNotes] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('sales')
  const [inviteNotes, setInviteNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  
  const confirmDialog = useConfirmDialog()

  // Load data
  const loadAllowedEmails = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getAllowedEmails()
      if (result.success && result.data) {
        setAllowedEmails(result.data)
      }
    } catch (err) {
      toast.error('Error al cargar correos')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUserProfiles = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const result = await getAllUserProfiles()
      if (result.success && result.data) {
        setUserProfiles(result.data)
      }
    } catch (err) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoadingAuditLogs(true)
      const result = await getAccessAuditLogs()
      if (result.success && result.data) {
        setAuditLogs(result.data)
      }
    } catch (err) {
      toast.error('Error al cargar auditoría')
    } finally {
      setLoadingAuditLogs(false)
    }
  }, [])

  useEffect(() => {
    loadAllowedEmails()
    loadUserProfiles()
  }, [loadAllowedEmails, loadUserProfiles])

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0) {
      loadAuditLogs()
    }
  }, [activeTab, auditLogs.length, loadAuditLogs])

  // Handlers
  const handleAddEmail = async () => {
    if (!newEmail.trim()) return toast.error('Ingrese un correo')
    try {
      setSubmitting(true)
      const result = await addAllowedEmail(newEmail.trim(), newEmailNotes.trim() || undefined)
      if (result.success) {
        toast.success('Correo agregado')
        setModalType(null)
        setNewEmail('')
        setNewEmailNotes('')
        await loadAllowedEmails()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar correo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInviteUser = async () => {
    if (!inviteFirstName.trim() || !inviteLastName.trim()) return toast.error('Ingrese nombre y apellido')
    if (!inviteEmail.trim()) return toast.error('Ingrese un correo')
    try {
      setSubmitting(true)
      const result = await inviteUser(inviteEmail.trim(), inviteRole, {
        notes: inviteNotes.trim() || undefined,
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
      })
      if (result.success) {
        toast.success(`Invitación enviada a ${inviteEmail.trim()}`)
        setModalType(null)
        setInviteEmail('')
        setInviteFirstName('')
        setInviteLastName('')
        setInviteRole('sales')
        setInviteNotes('')
        await loadAllowedEmails()
      } else {
        toast.error(result.error || 'Error al enviar invitación')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar invitación')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendInvitation = async (email: string) => {
    try {
      setResendingEmail(email)
      const result = await resendInvitation(email)
      if (result.success) {
        toast.success(`Invitación reenviada a ${email}`)
        await loadAllowedEmails()
      } else {
        toast.error(result.error || 'Error al reenviar')
      }
    } catch (err) {
      toast.error('Error al reenviar invitación')
    } finally {
      setResendingEmail(null)
    }
  }

  const handleRevokeAccess = async (email: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Revocar Acceso',
      message: `¿Revocar acceso para ${email}?`,
      confirmText: 'Revocar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    try {
      const result = await revokeAccess(email)
      if (result.success) {
        toast.success('Acceso revocado')
        await loadAllowedEmails()
      }
    } catch (err) {
      toast.error('Error al revocar acceso')
    }
  }

  const handleReactivateAccess = async (email: string) => {
    try {
      const result = await reactivateAccess(email)
      if (result.success) {
        toast.success('Acceso reactivado')
        await loadAllowedEmails()
      }
    } catch (err) {
      toast.error('Error al reactivar acceso')
    }
  }

  const handleUpdateUserRole = async (clerkId: string) => {
    try {
      const result = await updateUserRole(clerkId, editingRole)
      if (result.success) {
        toast.success('Rol actualizado')
        setEditingUserId(null)
        await loadUserProfiles()
      } else {
        toast.error(result.error || 'Error al actualizar rol')
      }
    } catch (err) {
      toast.error('Error al actualizar rol')
    }
  }

  const handleDeleteUser = async (user: UserProfile) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Usuario',
      message: `¿Eliminar a ${user.name || user.email || 'este usuario'} de la base de datos? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    try {
      const result = await deleteUserProfile(user.clerkId)
      if (result.success) {
        toast.success('Usuario eliminado')
        await loadUserProfiles()
      } else {
        toast.error(result.error || 'Error al eliminar usuario')
      }
    } catch (err) {
      toast.error('Error al eliminar usuario')
    }
  }

  const handlePreviewSync = async () => {
    try {
      setLoadingSyncPreview(true)
      const result = await previewUserSync()
      if (result.success && result.data) {
        setSyncPreview(result.data)
      }
    } catch (err) {
      toast.error('Error al obtener vista previa')
    } finally {
      setLoadingSyncPreview(false)
    }
  }

  const handleApplySync = async () => {
    try {
      setApplyingSync(true)
      const result = await applyUserSync()
      if (result.success && result.data) {
        const { created, updated, deactivated, reactivated } = result.data
        const msgs = []
        if (created > 0) msgs.push(`${created} creados`)
        if (updated > 0) msgs.push(`${updated} actualizados`)
        if (deactivated > 0) msgs.push(`${deactivated} desactivados`)
        if (reactivated > 0) msgs.push(`${reactivated} reactivados`)
        toast.success(msgs.length > 0 ? `Sync: ${msgs.join(', ')}` : 'Sin cambios')
        setSyncPreview(null)
        await loadUserProfiles()
      }
    } catch (err) {
      toast.error('Error al sincronizar')
    } finally {
      setApplyingSync(false)
    }
  }

  // Filtered data
  const filteredEmails = allowedEmails.filter((e) => {
    const matchesSearch = e.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? e.isActive : !e.isActive)
    return matchesSearch && matchesStatus
  })

  const filteredUsers = userProfiles.filter((u) => {
    const q = userSearchQuery.toLowerCase()
    return u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  const hasChanges = syncPreview && (
    syncPreview.toCreate.length > 0 ||
    syncPreview.toUpdate.length > 0 ||
    syncPreview.toDeactivate.length > 0 ||
    syncPreview.toReactivate.length > 0
  )

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border border-gray-200 border-b-white -mb-px'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar correo..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="revoked">Revocados</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setModalType('add-email')} leftIcon={<AddIcon style={{ fontSize: 16 }} />}>
                  Agregar
                </Button>
                <Button size="sm" onClick={() => setModalType('invite')} leftIcon={<MailIcon style={{ fontSize: 16 }} />}>
                  Invitar
                </Button>
              </div>
            </div>

            {/* Email List */}
            <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'Sin resultados' : 'No hay correos. Haga clic en "Agregar" para comenzar.'}
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div key={email.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 ${!email.isActive ? 'bg-gray-50/50' : ''}`}>
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${email.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    
                    {/* Email & info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm truncate ${!email.isActive ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {email.email}
                        </span>
                        {email.invitationStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                            <PendingIcon style={{ fontSize: 12 }} /> Pendiente
                          </span>
                        )}
                        {email.invitationStatus === 'accepted' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            <CheckCircleIcon style={{ fontSize: 12 }} /> Aceptado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {email.invitedRole && <span>Rol: {email.invitedRole}</span>}
                        <span>{formatShortDate(email.createdAt)}</span>
                        {email.notes && <span className="truncate max-w-[200px]">{email.notes}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {email.invitationStatus === 'pending' && (
                        <button
                          onClick={() => handleResendInvitation(email.email)}
                          disabled={resendingEmail === email.email}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Reenviar"
                        >
                          {resendingEmail === email.email ? (
                            <SyncIcon style={{ fontSize: 18 }} className="animate-spin" />
                          ) : (
                            <ReplayIcon style={{ fontSize: 18 }} />
                          )}
                        </button>
                      )}
                      {email.isActive ? (
                        <button
                          onClick={() => handleRevokeAccess(email.email)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revocar"
                        >
                          <DeleteIcon style={{ fontSize: 18 }} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateAccess(email.email)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reactivar"
                        >
                          <RestoreIcon style={{ fontSize: 18 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {filteredEmails.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
                {filteredEmails.length} correo{filteredEmails.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="relative flex-1 max-w-xs">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handlePreviewSync}
                disabled={loadingSyncPreview}
                leftIcon={<SyncIcon style={{ fontSize: 16 }} className={loadingSyncPreview ? 'animate-spin' : ''} />}
              >
                Sync Clerk
              </Button>
            </div>

            {/* Sync Preview */}
            {syncPreview && (
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-900 text-sm">Vista previa de sincronización</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleApplySync} disabled={applyingSync || !hasChanges}>
                      {applyingSync ? 'Aplicando...' : 'Aplicar'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setSyncPreview(null)} disabled={applyingSync}>
                      Cancelar
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-700">+{syncPreview.toCreate.length} crear</span>
                  <span className="text-blue-700">{syncPreview.toUpdate.length} actualizar</span>
                  <span className="text-red-700">-{syncPreview.toDeactivate.length} desactivar</span>
                  <span className="text-amber-700">{syncPreview.toReactivate.length} reactivar</span>
                </div>
              </div>
            )}

            {/* User List */}
            <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
              {loadingUsers ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Sin usuarios</div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 ${!user.isActive ? 'opacity-60' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${user.isActive ? 'bg-gray-100' : 'bg-red-50'}`}>
                      {user.isActive ? (
                        <PersonIcon className="text-gray-500" style={{ fontSize: 18 }} />
                      ) : (
                        <PersonOffIcon className="text-red-400" style={{ fontSize: 18 }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${!user.isActive ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {user.name || 'Sin nombre'}
                        </span>
                        {!user.isActive && (
                          <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Inactivo</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{user.email || 'Sin correo'}</div>
                    </div>

                    {/* Role */}
                    <div className="flex-shrink-0">
                      {editingUserId === user.clerkId ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as UserRole)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {USER_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${ROLE_COLORS[user.role] || ROLE_COLORS.sales}`}>
                          {user.role}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingUserId === user.clerkId ? (
                        <>
                          <button
                            onClick={() => handleUpdateUserRole(user.clerkId)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <SaveIcon style={{ fontSize: 18 }} />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <CloseIcon style={{ fontSize: 18 }} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingUserId(user.clerkId); setEditingRole(user.role as UserRole) }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar rol"
                          >
                            <EditIcon style={{ fontSize: 18 }} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <DeleteIcon style={{ fontSize: 18 }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {filteredUsers.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Entity Access Tab */}
        {activeTab === 'entity-access' && (
          <div className="p-4">
            <EntityAccessSection />
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div>
            <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
              {loadingAuditLogs ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Sin registros de auditoría</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.action === 'granted' ? 'bg-green-500' : log.action === 'revoked' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{log.email}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          log.action === 'granted' ? 'bg-green-100 text-green-700' :
                          log.action === 'revoked' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.action === 'granted' ? 'Concedido' : log.action === 'revoked' ? 'Revocado' : log.action}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Por {log.performedBy} • {new Date(log.performedAt).toLocaleString()}
                        {log.notes && <span className="ml-2">• {log.notes}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setModalType(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {modalType === 'add-email' ? 'Agregar Correo' : 'Invitar Usuario'}
              </h3>
              <button onClick={() => !submitting && setModalType(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <CloseIcon style={{ fontSize: 20 }} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modalType === 'add-email' ? (
                <>
                  <Input
                    type="email"
                    label="Correo electrónico"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <Textarea
                    label="Notas (opcional)"
                    value={newEmailNotes}
                    onChange={(e) => setNewEmailNotes(e.target.value)}
                    placeholder="Notas sobre este acceso..."
                    rows={2}
                  />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Nombre"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      placeholder="Juan"
                    />
                    <Input
                      label="Apellido"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      placeholder="Pérez"
                    />
                  </div>
                  <Input
                    type="email"
                    label="Correo electrónico"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <Select
                    label="Rol"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    options={USER_ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                  <Textarea
                    label="Notas (opcional)"
                    value={inviteNotes}
                    onChange={(e) => setInviteNotes(e.target.value)}
                    placeholder="Notas sobre esta invitación..."
                    rows={2}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <Button variant="secondary" onClick={() => !submitting && setModalType(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={modalType === 'add-email' ? handleAddEmail : handleInviteUser} loading={submitting} disabled={submitting}>
                {modalType === 'add-email' ? 'Agregar' : 'Enviar Invitación'}
              </Button>
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
