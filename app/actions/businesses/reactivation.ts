'use server'

import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getBusinessSentRequestAgingByIds } from '@/lib/business'

export async function getBusinessSentRequestAgingMap(businessIds: string[]) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const agingMap = await getBusinessSentRequestAgingByIds(businessIds)
    return {
      success: true,
      data: Object.fromEntries(agingMap.entries()),
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessSentRequestAgingMap')
  }
}
