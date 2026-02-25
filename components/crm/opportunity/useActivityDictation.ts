'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getTodayInPanama } from '@/lib/date/timezone'

export interface ClassifiedActivityFields {
  category: 'meeting' | 'todo'
  title: string | null
  notes: string | null
  dueDate: string | null
  meetingWith: string | null
  position: string | null
  isDecisionMaker: 'si' | 'no' | 'no_se' | null
  meetingDetails: string | null
  reachedAgreement: 'si' | 'no' | null
  mainObjection: string | null
  objectionSolution: string | null
  nextSteps: string | null
}

export interface ActivityGuideItem {
  label: string
  suggestion: string
}

export type ActivityDialogMode = 'recording' | 'processing'

export interface ActivityDialogState {
  isOpen: boolean
  mode: ActivityDialogMode
  items: ActivityGuideItem[]
}

export type MissingDialogMode = 'missing' | 'recording' | 'processing'

export interface ActivityMissingFieldsDialogState {
  isOpen: boolean
  mode: MissingDialogMode
  missingRequired: string[]
  notDetected: string[]
}

type DictationState = 'idle' | 'recording' | 'processing'

const GUIDE_ITEMS: ActivityGuideItem[] = [
  { label: 'Tipo', suggestion: 'Diga si es una tarea o una reunión.' },
  { label: 'Fecha', suggestion: 'Cuándo debe hacerse o cuándo fue.' },
  // Task fields
  { label: 'Título', suggestion: 'Si es tarea, describa qué hay que hacer.' },
  { label: 'Detalles', suggestion: 'Contexto adicional, responsables u observaciones.' },
  // Meeting fields
  { label: 'Contacto', suggestion: 'Si es reunión, nombre de la persona.' },
  { label: 'Posición', suggestion: 'Cargo o rol del contacto.' },
  { label: 'Tomador de decisión', suggestion: '¿Es quien toma la decisión final?' },
  { label: 'Detalle reunión', suggestion: 'Qué se habló, intereses y contexto.' },
  { label: 'Acuerdo', suggestion: '¿Se llegó a un acuerdo o no?' },
  { label: 'Siguientes pasos', suggestion: 'Acciones concretas y fechas de seguimiento.' },
  { label: 'Objeción', suggestion: 'Si no hubo acuerdo, cuál fue la barrera.' },
]

const EMPTY_MISSING: { missingRequired: string[]; notDetected: string[] } = {
  missingRequired: [],
  notDetected: [],
}

function getMissingFields(fields: ClassifiedActivityFields): { missingRequired: string[]; notDetected: string[] } {
  const missingRequired: string[] = []
  const notDetected: string[] = []

  if (fields.category === 'todo') {
    if (!fields.title?.trim()) missingRequired.push('Título de la tarea')
    if (!fields.dueDate) notDetected.push('Fecha límite')
  } else {
    // Meeting required fields
    if (!fields.meetingWith?.trim()) missingRequired.push('Nombre del contacto')
    if (!fields.position?.trim()) missingRequired.push('Posición o cargo')
    if (!fields.meetingDetails?.trim()) missingRequired.push('Detalle de la reunión')
    if (!fields.isDecisionMaker) notDetected.push('Tomador de decisión')
    if (!fields.dueDate) notDetected.push('Fecha de la reunión')

    // Outcome fields: check if the meeting likely already happened
    // (date is today or past, or nextSteps/reachedAgreement were mentioned)
    const today = getTodayInPanama()
    const dateIsPastOrToday = fields.dueDate ? fields.dueDate <= today : false
    const hasOutcomeContext = !!fields.nextSteps?.trim() || !!fields.reachedAgreement

    if (dateIsPastOrToday || hasOutcomeContext) {
      if (!fields.nextSteps?.trim()) missingRequired.push('Siguientes pasos')
      if (!fields.reachedAgreement) notDetected.push('Acuerdo alcanzado')

      if (fields.reachedAgreement === 'no') {
        if (!fields.mainObjection?.trim()) missingRequired.push('Objeción principal')
        if (!fields.objectionSolution?.trim()) missingRequired.push('Solución a la objeción')
      }
    }
  }

  return { missingRequired, notDetected }
}

function hasMissing(m: { missingRequired: string[]; notDetected: string[] }): boolean {
  return m.missingRequired.length > 0 || m.notDetected.length > 0
}

export function useActivityDictation(options: {
  onResult: (fields: ClassifiedActivityFields) => void
}) {
  const [state, setState] = useState<DictationState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [dialog, setDialog] = useState<ActivityDialogState>({
    isOpen: false,
    mode: 'recording',
    items: GUIDE_ITEMS,
  })
  const [missingDialog, setMissingDialog] = useState<ActivityMissingFieldsDialogState>({
    isOpen: false,
    mode: 'missing',
    ...EMPTY_MISSING,
  })

  const speechRef = useRef<SpeechRecognitionInstance | null>(null)
  const dictatedTextRef = useRef('')
  const onResultRef = useRef(options.onResult)
  onResultRef.current = options.onResult
  const pendingFieldsRef = useRef<ClassifiedActivityFields | null>(null)
  const dictatingFromMissingRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
    return () => {
      if (speechRef.current) {
        speechRef.current.abort()
        speechRef.current = null
      }
    }
  }, [])

  function closeDialog() {
    setDialog(prev => ({ ...prev, isOpen: false }))
  }

  function closeMissingDialog() {
    setMissingDialog({ isOpen: false, mode: 'missing', ...EMPTY_MISSING })
    pendingFieldsRef.current = null
    dictatingFromMissingRef.current = false
  }

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
    setDialog({ isOpen: false, mode: 'recording', items: GUIDE_ITEMS })
    setMissingDialog({ isOpen: false, mode: 'missing', ...EMPTY_MISSING })
    dictatedTextRef.current = ''
    pendingFieldsRef.current = null
    dictatingFromMissingRef.current = false
    if (speechRef.current) {
      speechRef.current.abort()
      speechRef.current = null
    }
  }, [])

  async function processText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      setState('idle')
      closeDialog()
      return
    }

    setState('processing')
    const fromMissing = dictatingFromMissingRef.current

    if (fromMissing) {
      setMissingDialog(prev => ({ ...prev, isOpen: true, mode: 'processing' }))
    } else {
      setDialog(prev => ({ ...prev, isOpen: true, mode: 'processing' }))
    }
    setError(null)

    try {
      let corrected = trimmed
      try {
        const proofRes = await fetch('/api/ai/proofread-task-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        })
        const proofData = await proofRes.json().catch(() => null)
        if (proofRes.ok && proofData?.text) {
          corrected = proofData.text.trim() || trimmed
        }
      } catch {
        // Continue with original
      }

      const res = await fetch('/api/ai/classify-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: corrected, todayDate: getTodayInPanama() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo clasificar la actividad.')
      }

      const fields = data?.fields as ClassifiedActivityFields | undefined
      if (!fields || typeof fields !== 'object') {
        throw new Error('Respuesta inválida.')
      }

      // Merge with pending fields from previous attempt if re-dictating
      const merged: ClassifiedActivityFields = pendingFieldsRef.current
        ? {
            category: fields.category,
            title: fields.title || pendingFieldsRef.current.title,
            notes: fields.notes || pendingFieldsRef.current.notes,
            dueDate: fields.dueDate || pendingFieldsRef.current.dueDate,
            meetingWith: fields.meetingWith || pendingFieldsRef.current.meetingWith,
            position: fields.position || pendingFieldsRef.current.position,
            isDecisionMaker: fields.isDecisionMaker || pendingFieldsRef.current.isDecisionMaker,
            meetingDetails: fields.meetingDetails || pendingFieldsRef.current.meetingDetails,
            reachedAgreement: fields.reachedAgreement || pendingFieldsRef.current.reachedAgreement,
            mainObjection: fields.mainObjection || pendingFieldsRef.current.mainObjection,
            objectionSolution: fields.objectionSolution || pendingFieldsRef.current.objectionSolution,
            nextSteps: fields.nextSteps || pendingFieldsRef.current.nextSteps,
          }
        : fields

      setState('idle')
      closeDialog()
      dictatingFromMissingRef.current = false

      const missing = getMissingFields(merged)
      if (hasMissing(missing)) {
        pendingFieldsRef.current = merged
        setMissingDialog({
          isOpen: true,
          mode: 'missing',
          missingRequired: missing.missingRequired,
          notDetected: missing.notDetected,
        })
      } else {
        pendingFieldsRef.current = null
        setMissingDialog({ isOpen: false, mode: 'missing', ...EMPTY_MISSING })
        onResultRef.current(merged)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar.'
      setError(msg)
      setState('idle')
      closeDialog()
      if (fromMissing) {
        setMissingDialog(prev => ({ ...prev, isOpen: true, mode: 'missing' }))
      }
      dictatingFromMissingRef.current = false
    }
  }

  function toggle() {
    if (state === 'recording') {
      stop()
    } else if (state === 'idle') {
      start()
    }
  }

  function stop() {
    if (speechRef.current) {
      speechRef.current.stop()
    }
  }

  function handleDialogStop() {
    stop()
  }

  function handleDialogHide() {
    closeDialog()
  }

  // Missing dialog handlers
  function handleMissingManual() {
    // Proceed with what we have — open TaskModal with partial data
    const fields = pendingFieldsRef.current
    dictatingFromMissingRef.current = false
    closeMissingDialog()
    if (fields) {
      onResultRef.current(fields)
    }
  }

  function handleMissingDictate() {
    if (!speechSupported) {
      setError('Dictado no disponible en este navegador.')
      return
    }
    dictatingFromMissingRef.current = true
    setMissingDialog(prev => ({ ...prev, mode: 'recording' }))
    startDictation(true)
  }

  function handleMissingStopDictation() {
    stop()
  }

  function start() {
    startDictation(false)
  }

  function startDictation(fromMissing: boolean) {
    if (typeof window === 'undefined') return
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) {
      setSpeechSupported(false)
      setError('Este navegador no soporta dictado por voz.')
      return
    }

    setError(null)
    dictatedTextRef.current = ''

    const recognition = new Ctor()
    recognition.lang = 'es-PA'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState('recording')
      if (fromMissing) {
        setMissingDialog(prev => ({ ...prev, isOpen: true, mode: 'recording' }))
      } else {
        setDialog({ isOpen: true, mode: 'recording', items: GUIDE_ITEMS })
      }
    }

    recognition.onresult = (event) => {
      let finalChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result?.isFinal) {
          finalChunk += result[0]?.transcript || ''
        }
      }
      if (finalChunk.trim()) {
        const prev = dictatedTextRef.current
        dictatedTextRef.current = prev
          ? (/[\s\n]$/.test(prev) ? `${prev}${finalChunk.trim()}` : `${prev} ${finalChunk.trim()}`)
          : finalChunk.trim()
      }
    }

    recognition.onerror = (event) => {
      const code = event.error || 'unknown'
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Permiso de micrófono denegado. Habilítelo en su navegador.')
      } else if (code === 'no-speech') {
        setError('No se detectó voz. Intente nuevamente.')
      } else if (code === 'audio-capture') {
        setError('No se pudo acceder al micrófono.')
      } else {
        setError('Se interrumpió el dictado.')
      }
      setState('idle')
      if (fromMissing) {
        setMissingDialog(prev => ({ ...prev, mode: 'missing' }))
      } else {
        closeDialog()
      }
    }

    recognition.onend = () => {
      if (speechRef.current === recognition) {
        speechRef.current = null
      }
      const text = dictatedTextRef.current.trim()
      if (text) {
        void processText(text)
      } else {
        setState('idle')
        if (fromMissing) {
          setMissingDialog(prev => ({ ...prev, mode: 'missing' }))
        } else {
          closeDialog()
        }
      }
    }

    speechRef.current = recognition
    try {
      recognition.start()
    } catch {
      setState('idle')
      if (fromMissing) {
        setMissingDialog(prev => ({ ...prev, mode: 'missing' }))
      } else {
        closeDialog()
      }
      setError('No se pudo iniciar el dictado.')
    }
  }

  return {
    state,
    error,
    speechSupported,
    dialog,
    missingDialog,
    toggle,
    handleDialogStop,
    handleDialogHide,
    handleMissingManual,
    handleMissingDictate,
    handleMissingStopDictation,
    reset,
  }
}
