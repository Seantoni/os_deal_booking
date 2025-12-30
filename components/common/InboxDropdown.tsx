'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import InboxIcon from '@mui/icons-material/Inbox'
import CloseIcon from '@mui/icons-material/Close'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import HandshakeIcon from '@mui/icons-material/Handshake'
import CampaignIcon from '@mui/icons-material/Campaign'
import { formatRelativeTime } from '@/lib/date'
import {
  getInboxItems,
  type InboxItem,
} from '@/app/actions/inbox'
import toast from 'react-hot-toast'

interface InboxDropdownProps {
  onClose?: () => void
}

export default function InboxDropdown({ onClose }: InboxDropdownProps) {
  const router = useRouter()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load inbox items
  useEffect(() => {
    loadInboxItems()
  }, [])

  const loadInboxItems = async () => {
    setLoading(true)
    try {
      const result = await getInboxItems()
      if (result.success && result.data) {
        setItems(result.data)
      } else {
        toast.error(result.error || 'Error al cargar el inbox')
      }
    } catch (err) {
      toast.error('Error al cargar el inbox')
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = (item: InboxItem) => {
    router.push(item.linkUrl)
    onClose?.()
  }

  const getTypeIcon = (type: InboxItem['type']) => {
    switch (type) {
      case 'opportunity_comment':
      case 'opportunity_mention':
        return <HandshakeIcon className="text-orange-500" style={{ fontSize: 18 }} />
      case 'marketing_comment':
      case 'marketing_mention':
        return <CampaignIcon className="text-purple-500" style={{ fontSize: 18 }} />
      default:
        return <ChatBubbleOutlineIcon className="text-gray-400" style={{ fontSize: 18 }} />
    }
  }

  const getTypeLabel = (type: InboxItem['type']) => {
    switch (type) {
      case 'opportunity_mention':
        return 'Mencionado en Oportunidad'
      case 'opportunity_comment':
        return 'Comentario en Oportunidad'
      case 'marketing_mention':
        return 'Mencionado en Marketing'
      case 'marketing_comment':
        return 'Comentario en Marketing'
      default:
        return 'Comentario'
    }
  }

  // Truncate content
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <InboxIcon className="text-gray-600" style={{ fontSize: 20 }} />
          <h3 className="text-sm font-semibold text-gray-900">Inbox</h3>
          {items.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <CloseIcon style={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <InboxIcon className="text-gray-300 mb-3" style={{ fontSize: 48 }} />
            <p className="text-sm font-medium text-gray-500">No hay mensajes pendientes</p>
            <p className="text-xs text-gray-400 mt-1">Tu inbox está vacío</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        {item.author.name || item.author.email || 'Usuario'}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {truncateContent(item.content)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900">
                        {item.entityName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={loadInboxItems}
            disabled={loading}
            className="w-full text-xs text-gray-600 hover:text-gray-900 font-medium py-2 px-3 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>
      )}
    </div>
  )
}

