'use client'

import { useMemo } from 'react'
import PersonIcon from '@mui/icons-material/Person'

export interface UserFilterOption {
  id: string
  name: string
  email?: string | null
}

interface UserFilterDropdownProps {
  users: UserFilterOption[]
  value: string | null
  onChange: (userId: string | null) => void
  label?: string
  placeholder?: string
  className?: string
}

/**
 * Compact dropdown for filtering by user (admin-only quick filter)
 * Shows after filter tabs, right side of header
 */
export function UserFilterDropdown({
  users,
  value,
  onChange,
  label = 'Usuario',
  placeholder = 'Todos',
  className = '',
}: UserFilterDropdownProps) {
  // Sort users alphabetically by name
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => 
      (a.name || a.email || '').localeCompare(b.name || b.email || '')
    )
  }, [users])

  // Find selected user for display
  const selectedUser = useMemo(() => {
    if (!value) return null
    return users.find(u => u.id === value)
  }, [users, value])

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <PersonIcon className="text-gray-400" style={{ fontSize: 16 }} />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="text-[11px] font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 border-0 cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-6"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.25rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1rem 1rem',
        }}
        title={`${label}: ${selectedUser?.name || placeholder}`}
      >
        <option value="">{placeholder}</option>
        {sortedUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.email || user.id}
          </option>
        ))}
      </select>
    </div>
  )
}

export default UserFilterDropdown
