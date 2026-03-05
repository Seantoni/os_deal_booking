'use client'

import Image from 'next/image'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import { formatDateForDisplay } from '@/lib/date'
import type { FieldComment } from '@/types'
import { FieldCommentShell } from './FieldCommentShell'
import type { CommentReplyPrefill, MentionUsersAction } from './types'

type PricingOptionView = {
  title?: string
  description?: string
  price?: string | number
  realValue?: string | number
  quantity?: string | number
  imageUrl?: string
  limitByUser?: string | number
  maxGiftsPerUser?: string | number
  endAt?: string
  expiresIn?: string | number
}

interface PricingOptionsFieldProps {
  fieldKey: string
  label: string
  options: PricingOptionView[]
  comments: FieldComment[]
  containerId: string
  highlightedCommentId: string | null
  activeCommentField: string | null
  savingComment: boolean
  commentInputPrefill: CommentReplyPrefill | null
  onToggleComment: (fieldKey: string | null) => void
  onAddComment: (text: string, mentions: string[]) => Promise<void>
  onReplyToComment: (comment: FieldComment) => void
  getUsersAction: MentionUsersAction
  openLightbox: (images: string[], initialIndex?: number) => void
  onDownloadImage: (url: string, fallbackName: string) => void | Promise<void>
  imageDownloadPrefix: string
}

function formatOptionDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : formatDateForDisplay(date, 'es-ES')
}

export function PricingOptionsField({
  fieldKey,
  label,
  options,
  comments,
  containerId,
  highlightedCommentId,
  activeCommentField,
  savingComment,
  commentInputPrefill,
  onToggleComment,
  onAddComment,
  onReplyToComment,
  getUsersAction,
  openLightbox,
  onDownloadImage,
  imageDownloadPrefix,
}: PricingOptionsFieldProps) {
  const pricingImages = options
    .filter((option) => option.imageUrl)
    .map((option) => option.imageUrl as string)

  return (
    <FieldCommentShell
      fieldKey={fieldKey}
      label={label}
      comments={comments}
      containerId={containerId}
      highlightedCommentId={highlightedCommentId}
      activeCommentField={activeCommentField}
      savingComment={savingComment}
      commentInputPrefill={commentInputPrefill}
      onToggleComment={onToggleComment}
      onAddComment={onAddComment}
      onReplyToComment={onReplyToComment}
      getUsersAction={getUsersAction}
    >
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
        {options.map((option, index) => (
          <div key={`${option.title || 'option'}-${index}`} className="p-4 md:p-5">
            <div className="flex flex-col sm:flex-row gap-4">
              {option.imageUrl && (
                <div className="relative w-full sm:w-40 h-32 rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => openLightbox(pricingImages, pricingImages.indexOf(option.imageUrl as string))}
                    className="absolute inset-0 cursor-zoom-in group"
                  >
                    <Image
                      src={option.imageUrl}
                      alt={option.title || `Opción ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomInIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" style={{ fontSize: 28 }} />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void onDownloadImage(option.imageUrl as string, `${imageDownloadPrefix}-pricing-${index + 1}`)
                    }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/55 text-white hover:bg-black/70 transition-colors"
                    title="Descargar imagen"
                    aria-label={`Descargar imagen de ${option.title || `opción ${index + 1}`}`}
                  >
                    <FileDownloadIcon style={{ fontSize: 16 }} />
                  </button>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 text-sm mb-1 break-words">
                  {option.title || `Opción ${index + 1}`}
                </p>
                {option.description && (
                  <p className="text-xs text-slate-500 mb-2 whitespace-pre-wrap break-words">
                    {option.description}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-600">${option.price || '0'}</span>
                  {option.realValue && Number.parseFloat(String(option.realValue)) > 0 && (
                    <span className="text-sm text-slate-400 line-through">${option.realValue}</span>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {option.quantity && option.quantity !== 'Ilimitado' && (
                    <p className="text-xs text-slate-500 break-words">Cantidad: {option.quantity}</p>
                  )}
                  {option.limitByUser && (
                    <p className="text-xs text-slate-500 break-words">Max Usuario: {option.limitByUser}</p>
                  )}
                  {option.maxGiftsPerUser && (
                    <p className="text-xs text-slate-500 break-words">Max Regalo: {option.maxGiftsPerUser}</p>
                  )}
                  {option.endAt && (
                    <p className="text-xs text-slate-500">Fecha fin: {formatOptionDate(option.endAt)}</p>
                  )}
                  {option.expiresIn && (
                    <p className="text-xs text-slate-500 break-words">Vence en: {option.expiresIn} días</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </FieldCommentShell>
  )
}
