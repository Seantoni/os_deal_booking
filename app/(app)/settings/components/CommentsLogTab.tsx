'use client'

import { useState, useEffect } from 'react'
import { getAllComments, type CommentLogItem } from '@/app/actions/comments'
import { formatCompactDateTime } from '@/lib/date'
import { Button } from '@/components/ui'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import HandshakeIcon from '@mui/icons-material/Handshake'
import CampaignIcon from '@mui/icons-material/Campaign'
import toast from 'react-hot-toast'

export default function CommentsLogTab() {
  const [comments, setComments] = useState<CommentLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 50

  const loadComments = async () => {
    setLoading(true)
    try {
      const result = await getAllComments(page, pageSize)
      
      if (result.success && result.data) {
        setComments(result.data.comments)
        setTotalPages(result.data.pagination.totalPages)
        setTotal(result.data.pagination.total)
      } else {
        toast.error(result.error || 'Error al cargar comentarios')
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
      toast.error('Error al cargar comentarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [page])

  const getTypeBadge = (type: 'opportunity' | 'marketing') => {
    if (type === 'opportunity') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
          <HandshakeIcon style={{ fontSize: 12 }} />
          Oportunidad
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800">
        <CampaignIcon style={{ fontSize: 12 }} />
        Marketing
      </span>
    )
  }

  const getResponseBadge = (hasResponse: boolean) => {
    if (hasResponse) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
          <CheckCircleIcon style={{ fontSize: 12 }} />
          Sí
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
        <CancelIcon style={{ fontSize: 12 }} />
        No
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-800">
          Vista de todos los comentarios del sistema (Oportunidades y Marketing). 
          Esta tabla muestra quién escribió, dónde, cuándo, y si ha recibido respuesta.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header with refresh */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <ChatBubbleIcon style={{ fontSize: 18 }} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Todos los Comentarios</h3>
            <span className="text-xs text-gray-500">({total} total)</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPage(1)
              loadComments()
            }}
            disabled={loading}
            leftIcon={<RefreshIcon style={{ fontSize: 16 }} className={loading ? 'animate-spin' : ''} />}
          >
            Actualizar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Autor
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Entidad
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider max-w-xs">
                  Contenido
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Menciones
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Respuesta
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Respondido Por
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha Respuesta
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Descartado Por
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <RefreshIcon className="animate-spin mx-auto mb-2" style={{ fontSize: 24 }} />
                    <p>Cargando comentarios...</p>
                  </td>
                </tr>
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <ChatBubbleIcon className="mx-auto mb-2 text-gray-400" style={{ fontSize: 48 }} />
                    <p className="font-medium">No hay comentarios</p>
                    <p className="text-xs mt-1">Los comentarios aparecerán aquí cuando se creen</p>
                  </td>
                </tr>
              ) : (
                comments.map((comment) => (
                  <tr key={`${comment.type}-${comment.id}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-[10px] text-gray-500 whitespace-nowrap">
                      {formatCompactDateTime(comment.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {getTypeBadge(comment.type)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-900">
                      <div className="font-medium">
                        {comment.author.name || comment.author.email?.split('@')[0] || 'Unknown'}
                      </div>
                      {comment.author.email && (
                        <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                          {comment.author.email}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-700 max-w-[150px] truncate" title={comment.entityName}>
                      {comment.entityName}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-600 max-w-[200px]">
                      <div className="truncate" title={comment.content}>
                        {comment.content}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600">
                      {comment.mentionNames.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {comment.mentionNames.map((name, i) => (
                            <span
                              key={i}
                              className="inline-block px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px]"
                            >
                              @{name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {getResponseBadge(comment.hasResponse)}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600">
                      {comment.responseByName || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500 whitespace-nowrap">
                      {comment.responseDate ? formatCompactDateTime(comment.responseDate) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600">
                      {comment.dismissedByNames.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {comment.dismissedByNames.map((name, i) => (
                            <span
                              key={i}
                              className="inline-block px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px]"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-500">
              Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} de {total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Anterior
              </Button>
              <span className="text-xs text-gray-600 font-medium px-2">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
