'use client'

import type { FieldComment, SectionDefinition } from '@/types'

export type MentionableUser = {
  clerkId: string
  name: string | null
  email: string | null
}

export type CommentReplyPrefill = {
  fieldKey: string
  value: string
  mentions: MentionableUser[]
  nonce: number
}

export type BookingAttachmentItem = {
  url: string
  filename: string
  mimeType: string
  size: number
}

export type MentionUsersAction = (
  search?: string
) => Promise<{
  success: boolean
  data?: MentionableUser[]
  error?: string
}>

export type AdditionalSectionData = {
  section: SectionDefinition
  values: Record<string, string>
  legacyCommentFieldKeyMap: Record<string, string>
}

export type DisplayComment = FieldComment
