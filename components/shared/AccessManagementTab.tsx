'use client'

import { useState, useEffect } from 'react'
import {
  getAllowedEmails,
  addAllowedEmail,
  revokeAccess,
  reactivateAccess,
  getAccessAuditLogs,
  inviteUser,
} from '@/app/actions/access-control'
import { getAllUserProfiles, updateUserRole } from '@/app/actions/users'
import type { UserRole } from '@/lib/auth/roles'
import { USER_ROLE_OPTIONS } from '@/lib/constants'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'

// Types inferred from Prisma responses
type AllowedEmail = Awaited<ReturnType<typeof getAllowedEmails>>[0]
type AccessAuditLog = Awaited<ReturnType<typeof getAccessAuditLogs>>[0]
type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string
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
import { Button, Alert, Select, Input, Textarea } from '@/components/ui'

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
      const emails = await getAllowedEmails()
      setAllowedEmails(emails)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowed emails')
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
        setError(result.error || 'Failed to load user profiles')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user profiles')
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
        setSuccess('User role updated successfully')
        setEditingUserId(null)
        await loadUserProfiles()
      } else {
        setError(result.error || 'Failed to update user role')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
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

  async function handleAddEmail() {
    if (!newEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    try {
      setError(null)
      setSuccess(null)
      const result = await addAllowedEmail(newEmail.trim(), newEmailNotes.trim() || undefined)
      
      if (result.success) {
        toast.success(`Email ${result.action === 'reactivated' ? 'reactivated' : 'added'} successfully`)
        setNewEmail('')
        setNewEmailNotes('')
        setShowAddForm(false)
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add email'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  async function handleInviteUser() {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address')
      toast.error('Please enter an email address')
      return
    }

    try {
      setInviting(true)
      setError(null)
      setSuccess(null)
      const result = await inviteUser(inviteEmail.trim(), inviteRole, inviteNotes.trim() || undefined)
      
      if (result.success) {
        toast.success(`Invitation sent successfully to ${inviteEmail.trim()}`)
        setInviteEmail('')
        setInviteRole('sales')
        setInviteNotes('')
        setShowInviteForm(false)
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setInviting(false)
    }
  }

  const confirmDialog = useConfirmDialog()

  async function handleRevokeAccess(email: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Revoke Access',
      message: `Are you sure you want to revoke access for ${email}? This action cannot be undone.`,
      confirmText: 'Revoke',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    try {
      setError(null)
      setSuccess(null)
      const result = await revokeAccess(email)
      if (result.success) {
        toast.success('Access revoked successfully')
        setSuccess('Access revoked successfully')
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke access'
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
        toast.success('Access reactivated successfully')
        setSuccess('Access reactivated successfully')
        await loadAllowedEmails()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate access'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error reactivating access:', err)
    }
  }

  async function loadAuditLogs() {
    try {
      setLoadingAuditLogs(true)
      const logs = await getAccessAuditLogs()
      setAuditLogs(logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
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
            Add Email
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
            Invite User
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Add Email Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Email to Allowlist</h3>
          <p className="text-sm text-gray-600 mb-4">Add an email to the allowlist without sending an invitation.</p>
          <div className="space-y-4">
            <Input
              type="email"
              label="Email Address *"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <Textarea
              label="Notes (Optional)"
              value={newEmailNotes}
              onChange={(e) => setNewEmailNotes(e.target.value)}
              placeholder="Optional notes about this access grant..."
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={handleAddEmail}>Add Email</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false)
                  setNewEmail('')
                  setNewEmailNotes('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Form */}
      {showInviteForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite User</h3>
          <p className="text-sm text-gray-600 mb-4">Send an invitation email via Clerk. The user will receive a signup link and instructions.</p>
          <div className="space-y-4">
            <Input
              type="email"
              label="Email Address *"
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
              <p className="text-xs text-gray-500 mt-1">This role will be assigned when the user accepts the invitation.</p>
            </div>
            <Textarea
              label="Notes (Optional)"
              value={inviteNotes}
              onChange={(e) => setInviteNotes(e.target.value)}
              placeholder="Optional notes about this invitation..."
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={handleInviteUser} disabled={inviting} loading={inviting}>
                Send Invitation
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowInviteForm(false)
                  setInviteEmail('')
                  setInviteRole('sales')
                  setInviteNotes('')
                }}
                disabled={inviting}
              >
                Cancel
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
              placeholder="Search by email..."
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
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'revoked', label: 'Revoked' },
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
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Section */}
      {showAuditLogs && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h3>
          {loadingAuditLogs ? (
            <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Performed By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
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
                          {log.action}
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
          <div className="text-center py-12 text-gray-500">Loading allowed emails...</div>
        ) : paginatedEmails.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || filterStatus !== 'all'
              ? 'No emails match your search criteria'
              : 'No allowed emails found. Click "Add Email" to get started.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Access Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invitation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
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
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700">
                            <CancelIcon fontSize="small" />
                            <span>Revoked</span>
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
                              <span className="capitalize">{email.invitationStatus}</span>
                            </span>
                            {email.invitedRole && (
                              <span className="text-xs text-gray-500">Role: {email.invitedRole}</span>
                            )}
                            {email.invitedAt && (
                              <span className="text-xs text-gray-500">
                                Sent: {new Date(email.invitedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No invitation</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(email.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{email.notes || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {email.isActive ? (
                            <button
                              onClick={() => handleRevokeAccess(email.email)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Revoke Access"
                            >
                              <DeleteIcon fontSize="small" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateAccess(email.email)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Reactivate Access"
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
                  Showing {(currentPage - 1) * emailsPerPage + 1} to{' '}
                  {Math.min(currentPage * emailsPerPage, filteredEmails.length)} of{' '}
                  {filteredEmails.length} emails
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
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
        </div>

        {/* User Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <Input
            type="text"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            leftIcon={<SearchIcon className="text-gray-400" />}
            fullWidth={false}
          />
        </div>

        {/* Users Table */}
        {loadingUsers ? (
          <div className="text-center py-12 text-gray-500">Loading user profiles...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {userSearchQuery
              ? 'No users match your search criteria'
              : 'No user profiles found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Created</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-6 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <PersonIcon className="text-gray-400" fontSize="small" />
                        <span className="font-medium">{user.name || 'N/A'}</span>
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
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-6 text-sm text-right">
                      {editingUserId === user.clerkId ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateUserRole(user.clerkId)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Save"
                          >
                            <SaveIcon fontSize="small" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Cancel"
                          >
                            <CloseIcon fontSize="small" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Role"
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

