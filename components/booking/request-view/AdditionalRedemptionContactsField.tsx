'use client'

import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import type { FieldComment } from '@/types'
import type { AdditionalRedemptionContact } from '@/lib/booking-requests/additional-redemption-contacts'
import { FieldCommentShell } from './FieldCommentShell'
import type { CommentReplyPrefill, MentionUsersAction } from './types'

interface AdditionalRedemptionContactsFieldProps {
  fieldKey: string
  label: string
  contacts: AdditionalRedemptionContact[]
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
}

export function AdditionalRedemptionContactsField({
  fieldKey,
  label,
  contacts,
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
}: AdditionalRedemptionContactsFieldProps) {
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
      <div className="grid grid-cols-1 gap-3">
        {contacts.map((contact, index) => (
          <div
            key={`additional-redemption-contact-${index}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <PersonOutlineIcon style={{ fontSize: 18 }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {contact.name || `Contacto ${index + 1}`}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                    Adicional
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex min-w-0 items-center gap-2 hover:text-blue-600"
                    >
                      <EmailOutlinedIcon style={{ fontSize: 16 }} className="shrink-0 text-slate-400" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex min-w-0 items-center gap-2 hover:text-blue-600"
                    >
                      <PhoneOutlinedIcon style={{ fontSize: 16 }} className="shrink-0 text-slate-400" />
                      <span className="truncate">{contact.phone}</span>
                    </a>
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
