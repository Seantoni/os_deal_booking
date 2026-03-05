'use client'

import type { BookingRequestViewData, Deal } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import CommentIcon from '@mui/icons-material/Comment'
import BlockIcon from '@mui/icons-material/Block'
import CampaignIcon from '@mui/icons-material/Campaign'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ListAltIcon from '@mui/icons-material/ListAlt'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

interface BookingRequestHeaderActionsProps {
  requestData: BookingRequestViewData | null
  userId?: string
  isAdmin: boolean
  loading: boolean
  approving: boolean
  editProcessing: boolean
  cancelling: boolean
  replicating: boolean
  loadingDealLink: boolean
  loadingPublicDealLink: boolean
  publicDealSlug: string | null
  internalDealId: string | null
  internalDeal: Deal | null
  showSidebar: boolean
  commentCount: number
  onOpenPublicDeal: () => void
  onOpenInternalDeal: () => void
  onApprove: () => void
  onEdit: () => void
  onCancel: () => void
  onReplicate: () => void
  onOpenDraftDeal: () => void
  onOpenMarketing: () => void
  onToggleSidebar: () => void
  onClose: () => void
}

export function BookingRequestHeaderActions({
  requestData,
  userId,
  isAdmin,
  loading,
  approving,
  editProcessing,
  cancelling,
  replicating,
  loadingDealLink,
  loadingPublicDealLink,
  publicDealSlug,
  internalDealId,
  internalDeal,
  showSidebar,
  commentCount,
  onOpenPublicDeal,
  onOpenInternalDeal,
  onApprove,
  onEdit,
  onCancel,
  onReplicate,
  onOpenDraftDeal,
  onOpenMarketing,
  onToggleSidebar,
  onClose,
}: BookingRequestHeaderActionsProps) {
  const status = requestData?.status
  const canEdit = status === 'draft' || status === 'pending'
  const canCancel =
    canEdit && (!!requestData && (requestData.userId === userId || isAdmin))

  return (
    <div className="flex items-center gap-1.5">
      {publicDealSlug && (
        <button
          type="button"
          onClick={onOpenPublicDeal}
          disabled={loading || loadingPublicDealLink}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Ver Deal Externo"
        >
          <VisibilityIcon style={{ fontSize: 20 }} />
        </button>
      )}

      {internalDealId && (
        <button
          type="button"
          onClick={onOpenInternalDeal}
          disabled={loading || loadingDealLink}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={internalDeal ? 'Ver Deal Interno' : 'Cargar Deal Interno'}
        >
          <ListAltIcon style={{ fontSize: 20 }} />
        </button>
      )}

      {status === 'pending' && isAdmin && (
        <button
          type="button"
          onClick={onApprove}
          disabled={loading || approving}
          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Aprobar solicitud"
        >
          <CheckCircleOutlineIcon style={{ fontSize: 20 }} />
        </button>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={loading || editProcessing}
          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={status === 'draft' ? 'Editar borrador' : 'Editar solicitud'}
        >
          <EditNoteIcon style={{ fontSize: 20 }} />
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading || cancelling}
          className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={cancelling ? 'Cancelando...' : 'Cancelar solicitud'}
        >
          <BlockIcon style={{ fontSize: 20 }} />
        </button>
      )}

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <button
        type="button"
        onClick={onReplicate}
        disabled={loading || !requestData || replicating}
        className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="Replicar"
      >
        <ContentCopyIcon style={{ fontSize: 20 }} />
      </button>

      {!publicDealSlug && (
        <button
          type="button"
          onClick={onOpenDraftDeal}
          disabled={loading || !requestData}
          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Ver Deal Draft"
        >
          <VisibilityIcon style={{ fontSize: 20 }} />
        </button>
      )}

      {status === 'booked' && requestData?.marketingCampaignId && (
        <button
          type="button"
          onClick={onOpenMarketing}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Ver Campaña de Marketing"
        >
          <CampaignIcon style={{ fontSize: 20 }} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleSidebar}
        className={`p-2 rounded-lg transition-all ${
          showSidebar
            ? 'bg-blue-50 text-blue-600 border border-blue-100'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
        }`}
        title={showSidebar ? 'Ocultar comentarios' : 'Ver comentarios'}
      >
        <CommentIcon style={{ fontSize: 20 }} />
        {commentCount > 0 && <span className="ml-1 text-xs font-bold">{commentCount}</span>}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        title="Cerrar"
      >
        <CloseIcon style={{ fontSize: 20 }} />
      </button>
    </div>
  )
}
