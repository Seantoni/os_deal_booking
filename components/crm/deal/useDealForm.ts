import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllUsers } from '@/app/actions/crm'
import { formatDateForPanama } from '@/lib/date/timezone'
import type { Deal, UserProfile } from '@/types'

interface UseDealFormProps {
  isOpen: boolean
  deal: Deal | null
  isAdmin: boolean
}

export function useDealForm({
  isOpen,
  deal,
  isAdmin,
}: UseDealFormProps) {
  // Form state
  const [responsibleId, setResponsibleId] = useState('')
  const [ereResponsibleId, setEreResponsibleId] = useState('')
  const [status, setStatus] = useState('pendiente_por_asignar')
  const [deliveryDate, setDeliveryDate] = useState('')

  // Data state
  const [users, setUsers] = useState<UserProfile[]>([])
  const [editorUsers, setEditorUsers] = useState<UserProfile[]>([])
  const [ereUsers, setEreUsers] = useState<UserProfile[]>([])

  // Loading state
  const [loadingData, setLoadingData] = useState(false)

  // Track what we've loaded to prevent re-fetching
  const loadedForRef = useRef<string | null>(null)
  const dealRef = useRef(deal)
  dealRef.current = deal

  // Reusable load function
  const loadFormData = useCallback(async () => {
    const currentDeal = dealRef.current

    setLoadingData(true)
    try {
      // Load users if admin
      if (isAdmin) {
        const usersResult = await getAllUsers()
        if (usersResult.success && usersResult.data) {
          setUsers(usersResult.data)
          // Filter users by role
          setEditorUsers(usersResult.data.filter((u: UserProfile) => u.role === 'editor'))
          setEreUsers(usersResult.data.filter((u: UserProfile) => u.role === 'ere'))
        }
      }

      // Pre-fill form if editing
      if (currentDeal) {
        setResponsibleId(currentDeal.responsibleId || '')
        setEreResponsibleId(currentDeal.ereResponsibleId || '')
        setStatus(currentDeal.status || 'pendiente_por_asignar')
        setDeliveryDate(currentDeal.deliveryDate ? formatDateForPanama(new Date(currentDeal.deliveryDate)) : '')
      } else {
        setResponsibleId('')
        setEreResponsibleId('')
        setStatus('pendiente_por_asignar')
        setDeliveryDate('')
      }
    } finally {
      setLoadingData(false)
    }
  }, [isAdmin])

  // Main load effect
  useEffect(() => {
    if (!isOpen) {
      loadedForRef.current = null
      return
    }

    const currentKey = deal?.id || 'new'
    
    if (loadedForRef.current === currentKey) {
      return
    }

    loadedForRef.current = currentKey
    loadFormData()
  }, [isOpen, deal?.id, loadFormData])

  return {
    // Form state
    responsibleId,
    setResponsibleId,
    ereResponsibleId,
    setEreResponsibleId,
    status,
    setStatus,
    deliveryDate,
    setDeliveryDate,
    
    // Data
    users,
    editorUsers,
    ereUsers,
    
    // Loading
    loadingData,
  }
}
