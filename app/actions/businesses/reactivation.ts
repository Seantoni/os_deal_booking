'use server'

import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getBusinessApprovedRequestAgingByIds } from '@/lib/business'

export async function getBusinessApprovedRequestAgingMap(businessIds: string[]) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const agingMap = await getBusinessApprovedRequestAgingByIds(businessIds)
    return {
      success: true,
      data: Object.fromEntries(agingMap.entries()),
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessApprovedRequestAgingMap')
  }
}
