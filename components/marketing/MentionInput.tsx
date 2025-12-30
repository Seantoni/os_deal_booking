'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getUsersForMention } from '@/app/actions/marketing-comments'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'
import toast from 'react-hot-toast'

interface User {
  clerkId: string
  name: string | null
  email: string | null
}

interface Attachment {
  url: string
  filename: string
  type: string
  size: number
}

interface MentionInputProps {
  onSubmit: (content: string, mentions: string[], attachments: Attachment[]) => Promise<void>
  placeholder?: string
  disabled?: boolean
  optionId?: string // Optional - only used for marketing options
  showAttachments?: boolean // Whether to show the attachment button
  getUsersAction?: (search?: string) => Promise<{ success: boolean; data?: User[]; error?: string }> // Custom action for getting users
}

export default function MentionInput({
  onSubmit,
  placeholder = 'Escribe un comentario... usa @ para mencionar',
  disabled = false,
  optionId,
  showAttachments = true,
  getUsersAction,
}: MentionInputProps) {
  const [value, setValue] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [selectedMentions, setSelectedMentions] = useState<User[]>([])
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionDropdownRef = useRef<HTMLDivElement>(null)

  // Debounced user search
  const searchUsers = useCallback(async (search: string) => {
    setLoading(true)
    try {
      // Use custom action if provided, otherwise use default
      const action = getUsersAction || getUsersForMention
      const result = await action(search || undefined)
      if (result.success && result.data) {
        setMentionUsers(result.data)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [getUsersAction])

  // Debounce the search
  useEffect(() => {
    if (!showMentions) return

    const timer = setTimeout(() => {
      searchUsers(mentionSearch)
    }, 200)

    return () => clearTimeout(timer)
  }, [mentionSearch, showMentions, searchUsers])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    setValue(newValue)

    // Check for @ trigger
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setShowMentions(true)
      setMentionSearch(atMatch[1])
      setMentionStartIndex(cursorPos - atMatch[0].length)
      setSelectedMentionIndex(0)
    } else {
      setShowMentions(false)
      setMentionSearch('')
      setMentionStartIndex(null)
    }
  }

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => Math.min(prev + 1, mentionUsers.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        insertMention(mentionUsers[selectedMentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Insert mention into text
  const insertMention = (user: User) => {
    if (mentionStartIndex === null) return

    const displayName = user.name || user.email?.split('@')[0] || 'user'
    const beforeMention = value.substring(0, mentionStartIndex)
    const afterMention = value.substring(textareaRef.current?.selectionStart || mentionStartIndex)

    const newValue = `${beforeMention}@${displayName} ${afterMention}`
    setValue(newValue)

    // Add to selected mentions if not already
    if (!selectedMentions.find((m) => m.clerkId === user.clerkId)) {
      setSelectedMentions([...selectedMentions, user])
    }

    setShowMentions(false)
    setMentionSearch('')
    setMentionStartIndex(null)

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus()
      const newCursorPos = beforeMention.length + displayName.length + 2 // +2 for @ and space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 5MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', `marketing-comments/${optionId}`)
      formData.append('makePublic', 'true')

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success && result.url) {
        setAttachments([
          ...attachments,
          {
            url: result.url,
            filename: file.name,
            type: file.type,
            size: file.size,
          },
        ])
        toast.success('Archivo adjuntado')
      } else {
        toast.error(result.error || 'Error al subir archivo')
      }
    } catch (err) {
      toast.error('Error al subir archivo')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  // Submit comment
  const handleSubmit = async () => {
    const trimmedValue = value.trim()
    if (!trimmedValue && attachments.length === 0) return
    if (submitting || disabled) return

    setSubmitting(true)
    try {
      // Filter mentions to only include those still present in the text
      // This handles the case where user types @Name but then deletes it
      const actualMentionIds = selectedMentions
        .filter((mention) => {
          const displayName = mention.name || mention.email?.split('@')[0] || ''
          // Check if @displayName is still in the text
          return trimmedValue.includes(`@${displayName}`)
        })
        .map((m) => m.clerkId)
      
      await onSubmit(trimmedValue, actualMentionIds, attachments)
      setValue('')
      setSelectedMentions([])
      setAttachments([])
    } catch (err) {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`relative transition-all ${isFocused ? 'ring-2 ring-blue-100 rounded-lg' : ''}`}>
      <div className={`bg-white border rounded-lg transition-colors ${isFocused ? 'border-blue-300 shadow-sm' : 'border-gray-200'}`}>
        
        {/* Attachments preview */}
        {showAttachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
            {attachments.map((att, index) => (
              <div key={index} className="relative group bg-white border border-gray-200 rounded p-1 shadow-sm">
                {att.type.startsWith('image/') ? (
                  <img src={att.url} alt={att.filename} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded">
                    <AttachFileIcon className="text-gray-400" style={{ fontSize: 20 }} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    removeAttachment(index)
                  }}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-white text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all border shadow-sm hover:shadow-md"
                >
                  <CloseIcon style={{ fontSize: 12 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || submitting}
          rows={1}
          className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed min-h-[44px] max-h-[160px] p-3 rounded-lg"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = Math.min(target.scrollHeight, 160) + 'px'
          }}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-50 bg-gray-50/30 rounded-b-lg">
          <div className="flex items-center gap-1">
             {/* Attachment button */}
             {showAttachments && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }}
                  disabled={disabled || uploading}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:cursor-not-allowed"
                  title="Adjuntar archivo"
                >
                  <AttachFileIcon style={{ fontSize: 18 }} />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1"></div>
              </>
            )}
            <span className="text-[10px] text-gray-400">
               Usa <kbd className="font-sans font-medium text-gray-500">@</kbd> para mencionar
            </span>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleSubmit()
            }}
            disabled={disabled || submitting || (!value.trim() && (!showAttachments || attachments.length === 0))}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 ${
              !value.trim() && (!showAttachments || attachments.length === 0)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : submitting
                ? 'bg-blue-500 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
            title={submitting ? 'Enviando...' : 'Enviar comentario'}
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium">Enviando...</span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium">Comentar</span>
                <SendIcon style={{ fontSize: 14 }} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mention dropdown */}
      {showMentions && (
        <div
          ref={mentionDropdownRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg border border-gray-200 shadow-xl max-h-[200px] overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-2 duration-100"
        >
          {loading ? (
            <div className="p-3 text-xs text-gray-500 text-center">Buscando usuarios...</div>
          ) : mentionUsers.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">No se encontraron usuarios</div>
          ) : (
            <ul className="py-1">
              {mentionUsers.map((user, index) => (
                <li
                  key={user.clerkId}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2.5 ${
                    index === selectedMentionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* User avatar */}
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center border border-blue-100 text-blue-600 text-[10px] font-bold">
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {user.name || user.email?.split('@')[0]}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
