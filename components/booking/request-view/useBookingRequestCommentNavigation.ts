'use client'

import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { FieldComment, SectionDefinition } from '@/types'
import type { CommentReplyPrefill, MentionableUser } from './types'
import {
  getCommentAuthorDisplayName,
  getFieldContainerId,
  getInlineCommentId,
} from './bookingRequestView.utils'

interface UseBookingRequestCommentNavigationOptions {
  allSections: SectionDefinition[]
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  setExpandedSections: Dispatch<SetStateAction<Set<string>>>
  setActiveCommentField: Dispatch<SetStateAction<string | null>>
  setCommentInputPrefill: Dispatch<SetStateAction<CommentReplyPrefill | null>>
}

export function useBookingRequestCommentNavigation({
  allSections,
  searchQuery,
  setSearchQuery,
  setExpandedSections,
  setActiveCommentField,
  setCommentInputPrefill,
}: UseBookingRequestCommentNavigationOptions) {
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)

  const expandSectionForField = useCallback(
    (fieldKey: string) => {
      const section = allSections.find((item) => item.fields.some((field) => field.key === fieldKey))
      if (!section) return

      setExpandedSections((current) => {
        if (current.has(section.title)) return current
        const next = new Set(current)
        next.add(section.title)
        return next
      })
    },
    [allSections, setExpandedSections]
  )

  const highlightCommentTemporarily = useCallback((commentId: string) => {
    setHighlightedCommentId(commentId)
    window.setTimeout(() => {
      setHighlightedCommentId((current) => (current === commentId ? null : current))
    }, 2200)
  }, [])

  const scrollToCommentLocation = useCallback(
    (comment: FieldComment) => {
      expandSectionForField(comment.fieldKey)

      let attempts = 0
      const maxAttempts = 6
      let searchReset = false

      const tryScroll = () => {
        const commentElement = document.getElementById(getInlineCommentId(comment.id))
        const fieldElement = document.getElementById(getFieldContainerId(comment.fieldKey))
        const target = commentElement || fieldElement

        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
          highlightCommentTemporarily(comment.id)
          return
        }

        if (attempts < maxAttempts) {
          attempts += 1
          window.setTimeout(tryScroll, 90)
        } else if (!searchReset && searchQuery.trim()) {
          searchReset = true
          setSearchQuery('')
          attempts = 0
          window.setTimeout(tryScroll, 120)
        }
      }

      window.setTimeout(tryScroll, 80)
    },
    [expandSectionForField, highlightCommentTemporarily, searchQuery, setSearchQuery]
  )

  const handleReplyToComment = useCallback(
    (comment: FieldComment) => {
      const authorDisplayName = getCommentAuthorDisplayName(comment)
      const mentionTarget: MentionableUser = {
        clerkId: comment.authorId,
        name: comment.authorName,
        email: comment.authorEmail,
      }

      setCommentInputPrefill({
        fieldKey: comment.fieldKey,
        value: `@${authorDisplayName}  `,
        mentions: [mentionTarget],
        nonce: Date.now(),
      })
      setActiveCommentField(comment.fieldKey)
      scrollToCommentLocation(comment)
    },
    [scrollToCommentLocation, setActiveCommentField, setCommentInputPrefill]
  )

  return {
    highlightedCommentId,
    setHighlightedCommentId,
    scrollToCommentLocation,
    handleReplyToComment,
  }
}
