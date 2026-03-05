'use client'

import type { ReactNode } from 'react'

interface CommentTextProps {
  content: string
}

export function CommentText({ content }: CommentTextProps) {
  const mentionRegex = /@[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,3}/gu
  const parts: Array<{ text: string; isMention: boolean }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), isMention: false })
    }

    parts.push({ text: match[0], isMention: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), isMention: false })
  }

  return (
    <>
      {parts.map<ReactNode>((part, index) =>
        part.isMention ? (
          <span key={index} className="text-blue-600 font-semibold">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  )
}
