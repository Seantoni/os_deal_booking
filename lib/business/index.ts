/**
 * Business utilities module
 * 
 * Centralizes business-related helper functions used across the application.
 */

export {
  getBusinessApprovedRequestAgingByIds,
  type BusinessApprovedRequestAgingRecord,
} from './approved-request-aging'

export {
  findLinkedBusiness,
  findLinkedBusinessFull,
  type LinkedBusinessInfo,
  type FindLinkedBusinessOptions,
} from './find-linked'
