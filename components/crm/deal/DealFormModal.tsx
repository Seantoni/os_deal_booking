'use client'

import { useEffect, useState, useMemo, useTransition } from 'react'
import { getDealPublicSlug, getEditorDeliveryWorkload, getSuggestedDeliveryDate, updateDealDeliveryDate, updateDealResponsible, updateDealStatus } from '@/app/actions/deals'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import { useCachedFormConfig } from '@/hooks/useFormConfigCache'
import type { Deal } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Button } from '@/components/ui'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { BookingRequestViewModal } from '@/components/booking/request-view'
import { useDealForm } from './useDealForm'
import DealStatusPipeline from './DealStatusPipeline'
import ResponsibleUserSection from './ResponsibleUserSection'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import BookingRequestSection from './BookingRequestSection'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import DealFormSkeleton from './DealFormSkeleton'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { formatDateForPanama, getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'

interface DealFormModalProps {
  isOpen: boolean
  onClose: () => void
  deal: Deal | null
  onSuccess: () => void
  hideBackdrop?: boolean
  containerClassName?: string
}

export default function DealFormModal({
  isOpen,
  onClose,
  deal,
  onSuccess,
  hideBackdrop = false,
  containerClassName,
}: DealFormModalProps) {
  const { isAdmin, isSales, isEditor, isEditorSenior } = useUserRole()
  const canViewOsAdminLink = isAdmin || isEditorSenior || isEditor
  const [error, setError] = useState('')
  const [bookingRequestModalOpen, setBookingRequestModalOpen] = useState(false)
  const [publicDealSlug, setPublicDealSlug] = useState<string | null>(null)
  const [loadingPublicDealSlug, setLoadingPublicDealSlug] = useState(false)
  const [suggestedDeliveryDate, setSuggestedDeliveryDate] = useState<string | null>(null)
  const [loadingSuggestedDate, setLoadingSuggestedDate] = useState(false)
  const [deliveryWorkload, setDeliveryWorkload] = useState<{ count: number; max: number } | null>(null)
  const [loadingDeliveryWorkload, setLoadingDeliveryWorkload] = useState(false)
  
  // Get cached form configuration (instant if already prefetched)
  const { sections: cachedSections, initialized: cachedInitialized } = useCachedFormConfig('deal')

  // React 19: useTransition for non-blocking UI during form actions
  const [isSubmitPending, startSubmitTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()
  
  // Combined loading states for UI
  const loading = isSubmitPending
  const savingStatus = isStatusPending

  const {
    responsibleId,
    setResponsibleId,
    ereResponsibleId,
    setEreResponsibleId,
    status,
    setStatus,
    deliveryDate,
    setDeliveryDate,
    users,
    editorUsers,
    ereUsers,
    loadingData,
  } = useDealForm({
    isOpen,
    deal,
    isAdmin,
  })

  const startDateKey = useMemo(() => {
    const startDateSource = deal?.eventDates?.startDate || deal?.bookingRequest?.startDate
    if (!startDateSource) return null
    return formatDateForPanama(new Date(startDateSource))
  }, [deal?.eventDates?.startDate, deal?.bookingRequest?.startDate])

  const maxDeliveryDate = useMemo(() => {
    if (!startDateKey) return undefined
    const start = parseDateInPanamaTime(startDateKey)
    const dayBefore = new Date(start.getTime() - ONE_DAY_MS)
    return formatDateForPanama(dayBefore)
  }, [startDateKey])

  const canShowSuggestedDeliveryDate = useMemo(
    () => status !== 'borrador_enviado' && status !== 'borrador_aprobado',
    [status]
  )

  // Build initial values from deal entity
  const initialValues = useMemo((): Record<string, string | null> => {
    if (!deal) return {}
    return {
      bookingRequestId: deal.bookingRequestId || null,
      status: deal.status || null,
      responsibleId: deal.responsibleId || null,
      ereResponsibleId: deal.ereResponsibleId || null,
    }
  }, [deal])

  // Dynamic form hook for custom fields - pass preloaded sections from cache
  const dynamicForm = useDynamicForm({
    entityType: 'deal',
    entityId: deal?.id,
    initialValues,
    // Use cached form config if available (instant load)
    preloadedSections: cachedSections.length > 0 ? cachedSections : undefined,
    preloadedInitialized: cachedInitialized,
  })

  // React 19: Status change handler using useTransition
  function handleStatusChange(newStatus: string) {
    if (!deal || !isAdmin || savingStatus) return
    
    const previousStatus = status
    setStatus(newStatus)
    setError('')
    
    startStatusTransition(async () => {
      try {
        const result = await updateDealStatus(deal.id, newStatus)
        if (result.success) {
          // Keep modal open and do not refresh list on stage change
        } else {
          setError(result.error || 'Error al actualizar el estado de la oferta')
          setStatus(previousStatus)
        }
      } catch (err) {
        setError('Ocurrió un error al actualizar el estado')
        setStatus(previousStatus)
      }
    })
  }

  // React 19: Form submit handler using useTransition
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!isAdmin) {
      return
    }
    
    if (!deal) {
      setError('Oferta no encontrada')
      return
    }

    if (deliveryDate && startDateKey && deliveryDate >= startDateKey) {
      setError('La fecha de entrega debe ser antes de la fecha de inicio.')
      return
    }
    
    setError('')

    startSubmitTransition(async () => {
      try {
        // Update both responsibles and status
        const [responsibleResult, statusResult, deliveryResult] = await Promise.all([
          updateDealResponsible(deal.id, responsibleId || null, ereResponsibleId || null),
          updateDealStatus(deal.id, status),
          updateDealDeliveryDate(deal.id, deliveryDate ? deliveryDate : null),
        ])

        if (responsibleResult.success && statusResult.success && deliveryResult.success) {
          // Save custom field values
          const customFieldResult = await dynamicForm.saveCustomFields(deal.id)
          if (!customFieldResult.success) {
            console.warn('Failed to save custom fields:', customFieldResult.error)
          }
          onSuccess()
          onClose()
        } else {
          setError(responsibleResult.error || statusResult.error || deliveryResult.error || 'Error al actualizar la oferta')
        }
      } catch (err) {
        setError('Ocurrió un error')
      }
    })
  }

  useEffect(() => {
    if (!isOpen || !deal?.bookingRequestId) {
      setPublicDealSlug(null)
      return
    }

    let cancelled = false
    setLoadingPublicDealSlug(true)
    getDealPublicSlug(deal.bookingRequestId)
      .then(result => {
        if (cancelled) return
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          setPublicDealSlug((result.data as string | null) || null)
        } else {
          setPublicDealSlug(null)
        }
      })
      .catch(() => {
        if (!cancelled) setPublicDealSlug(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingPublicDealSlug(false)
      })

    return () => {
      cancelled = true
    }
  }, [deal?.bookingRequestId, isOpen])

  useEffect(() => {
    const startDateSource = deal?.eventDates?.startDate || deal?.bookingRequest?.startDate
    if (!isOpen || !startDateSource) {
      setSuggestedDeliveryDate(null)
      return
    }
    if (!canShowSuggestedDeliveryDate) {
      setSuggestedDeliveryDate(null)
      return
    }

    let cancelled = false
    setLoadingSuggestedDate(true)
    getSuggestedDeliveryDate(formatDateForPanama(new Date(startDateSource)))
      .then(result => {
        if (cancelled) return
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          const data = result.data as { suggestedDate: string | null } | null
          setSuggestedDeliveryDate(data?.suggestedDate ?? null)
        } else {
          setSuggestedDeliveryDate(null)
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestedDeliveryDate(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestedDate(false)
      })

    return () => {
      cancelled = true
    }
  }, [canShowSuggestedDeliveryDate, deal?.eventDates?.startDate, deal?.bookingRequest?.startDate, isOpen])

  useEffect(() => {
    if (!isOpen || !startDateKey || !deliveryDate) return
    if (deliveryDate >= startDateKey) {
      setDeliveryDate('')
    }
  }, [deliveryDate, isOpen, setDeliveryDate, startDateKey])

  useEffect(() => {
    if (!isOpen || !deliveryDate || !responsibleId) {
      setDeliveryWorkload(null)
      return
    }

    let cancelled = false
    setLoadingDeliveryWorkload(true)
    getEditorDeliveryWorkload({
      responsibleId,
      deliveryDate,
      excludeDealId: deal?.id,
    })
      .then(result => {
        if (cancelled) return
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          setDeliveryWorkload((result.data as { count: number; max: number }) || null)
        } else {
          setDeliveryWorkload(null)
        }
      })
      .catch(() => {
        if (!cancelled) setDeliveryWorkload(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingDeliveryWorkload(false)
      })

    return () => {
      cancelled = true
    }
  }, [deal?.id, deliveryDate, isOpen, responsibleId])

  useEffect(() => {
    if (!isOpen) return
    if (status !== 'pendiente_por_asignar') return
    if (deliveryDate || !suggestedDeliveryDate) return
    setDeliveryDate(suggestedDeliveryDate)
  }, [deliveryDate, isOpen, status, suggestedDeliveryDate, setDeliveryDate])

  if (!isOpen) return null

  // Prepare users for dynamic fields
  const userOptions = users.map(user => ({
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
  }))

  // Filter sections to only show custom fields sections (deal built-in fields are handled specially)
  const customFieldsSections = dynamicForm.sections.filter(section => 
    section.fields.some(f => f.fieldSource === 'custom')
  )

  const osAdminDealId = deal?.bookingRequest?.dealId || null
  const osAdminDealUrl = osAdminDealId
    ? `https://ofertasimple.com/admin/offer/${osAdminDealId}/edit`
    : null
  const dealPublicUrl = publicDealSlug
    ? `https://ofertasimple.com/ofertas/panama/${publicDealSlug}`
    : null

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={deal?.bookingRequest?.name || 'Detalles de la Oferta'}
      subtitle="Oferta"
      icon={<DescriptionIcon fontSize="medium" />}
      iconColor="green"
      autoHeight
      maxWidth="2xl"
      hideBackdrop={hideBackdrop}
      containerClassName={containerClassName}
      headerActions={
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            onClick={() => setBookingRequestModalOpen(true)}
            variant="primary"
            size="xs"
            leftIcon={<DescriptionOutlinedIcon />}
            className="whitespace-nowrap"
          >
            Detalles
          </Button>
          {canViewOsAdminLink && osAdminDealUrl && (
            <Button
              type="button"
              onClick={() => window.open(osAdminDealUrl, '_blank', 'noopener,noreferrer')}
              variant="outline"
              size="xs"
              leftIcon={<OpenInNewIcon />}
              className="whitespace-nowrap"
            >
              OS Admin
            </Button>
          )}
        </div>
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel={isAdmin ? 'Cancelar' : 'Cerrar'}
          submitLabel="Guardar"
          submitLoading={loading || loadingData || dynamicForm.loading}
          submitDisabled={loading || loadingData || dynamicForm.loading || !isAdmin}
          leftContent={isAdmin ? 'Asignar un usuario responsable para esta oferta' : isSales ? 'Modo solo lectura - Puede ver ofertas de sus oportunidades' : 'Modo solo lectura'}
          formId="deal-modal-form"
        />
      }
    >

      <form id="deal-modal-form" onSubmit={handleSubmit} className="bg-gray-50 h-full flex flex-col">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {(loadingData || dynamicForm.loading) ? (
            <DealFormSkeleton />
          ) : (
            <div className="p-3 space-y-3">
              {/* Opportunity Responsible Reference */}
              {deal?.opportunityResponsible && (
                <ReferenceInfoBar>
                  <ReferenceInfoBar.UserDisplayItem
                    label="Representante de Ventas"
                    user={deal.opportunityResponsible}
                  />
                </ReferenceInfoBar>
              )}

              {/* Deal Status Pipeline */}
              <DealStatusPipeline
                status={status}
                onStatusChange={handleStatusChange}
                isAdmin={isAdmin}
                saving={savingStatus}
              />
              <div className="h-px bg-gray-200/70" />

              {/* Booking Request Summary */}
              {deal && (
                <BookingRequestSection
                  deal={deal}
                  onViewRequest={() => setBookingRequestModalOpen(true)}
                />
              )}

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
                  Link de la oferta
                </span>
                <div className="flex-1 min-w-0">
                  {dealPublicUrl ? (
                    <a
                      href={dealPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline break-all"
                    >
                      {dealPublicUrl}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {loadingPublicDealSlug ? 'Cargando...' : '-'}
                    </span>
                  )}
                </div>
              </div>

              {/* Responsible User Section */}
              <ResponsibleUserSection
                responsibleId={responsibleId}
                onResponsibleChange={setResponsibleId}
                ereResponsibleId={ereResponsibleId}
                onEreResponsibleChange={setEreResponsibleId}
                editorUsers={editorUsers}
                ereUsers={ereUsers}
                isAdmin={isAdmin}
                extraContent={
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0">
                        Fecha de entrega
                      </label>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="date"
                          value={deliveryDate || ''}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          disabled={!isAdmin || loading || loadingData}
                          max={maxDeliveryDate}
                          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                        />
                        {deliveryDate && (() => {
                          const today = parseDateInPanamaTime(getTodayInPanama())
                          const delivery = parseDateInPanamaTime(deliveryDate)
                          const daysUntil = Math.round((delivery.getTime() - today.getTime()) / ONE_DAY_MS)
                          const badgeClass = daysUntil < 0
                            ? 'bg-red-600 text-white border-red-600'
                            : daysUntil === 0
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : daysUntil <= 7
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
                              {Math.abs(daysUntil)} día{Math.abs(daysUntil) === 1 ? '' : 's'}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    {!loadingDeliveryWorkload && deliveryWorkload && deliveryWorkload.count + 1 > deliveryWorkload.max && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
                        <WarningAmberIcon style={{ fontSize: 14 }} className="mt-0.5" />
                        <span className="flex flex-wrap items-center gap-1">
                          Este usuario ya tiene el máximo de {deliveryWorkload.max} en esta fecha.
                          {suggestedDeliveryDate ? (
                            <>
                              <span>Haz clic para usar la fecha sugerida</span>
                              <button
                                type="button"
                                onClick={() => setDeliveryDate(suggestedDeliveryDate)}
                                disabled={!isAdmin || loading || loadingData}
                                className="inline-flex items-center rounded-md border border-amber-300 bg-white px-2 py-0.5 font-semibold text-amber-900 underline decoration-amber-600 hover:bg-amber-100 hover:text-amber-950 disabled:opacity-50"
                              >
                                {suggestedDeliveryDate}
                              </button>
                            </>
                          ) : (
                            <span>Puede guardar igualmente.</span>
                          )}
                        </span>
                      </div>
                    )}
                    {canShowSuggestedDeliveryDate
                      && suggestedDeliveryDate !== deliveryDate
                      && !(deliveryWorkload && deliveryWorkload.count + 1 > deliveryWorkload.max)
                      && (
                      <div className="text-[11px] text-gray-600">
                        {loadingSuggestedDate ? (
                          'Calculando fecha sugerida según carga...'
                        ) : suggestedDeliveryDate ? (
                          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2">
                            <div className="flex items-center gap-2">
                              <InfoOutlinedIcon style={{ fontSize: 14 }} className="text-slate-500" />
                              <span>
                                Fecha sugerida según carga:{' '}
                                <span className="font-semibold text-slate-800">{suggestedDeliveryDate}</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDeliveryDate(suggestedDeliveryDate)}
                              disabled={!isAdmin || loading || loadingData}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              Usar
                            </button>
                          </div>
                        ) : (
                          'No hay cupo disponible antes de la fecha de inicio.'
                        )}
                      </div>
                    )}
                  </div>
                }
              />

              {/* Dynamic Custom Fields Sections */}
              {dynamicForm.initialized && customFieldsSections.map(section => (
                <DynamicFormSection
                  key={section.id}
                  section={{
                    ...section,
                    fields: section.fields.filter(f => f.fieldSource === 'custom'),
                  }}
                  values={dynamicForm.getAllValues()}
                  onChange={dynamicForm.setValue}
                  disabled={loading || !isAdmin}
                  users={userOptions}
                  defaultExpanded={!section.isCollapsed}
                  collapsible={true}
                />
              ))}
            </div>
          )}

      </form>
    </ModalShell>

      {/* Booking Request Modal */}
      {deal && (
        <BookingRequestViewModal
          isOpen={bookingRequestModalOpen}
          onClose={() => setBookingRequestModalOpen(false)}
          requestId={deal.bookingRequestId}
        />
      )}
    </>
  )
}
