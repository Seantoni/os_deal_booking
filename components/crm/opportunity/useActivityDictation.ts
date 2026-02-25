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

type DictationState = 'idle' | 'recording' | 'processing'

const GUIDE_ITEMS: ActivityGuideItem[] = [
  { label: 'Tipo', suggestion: 'Diga si es una tarea o una reunión.' },
  { label: 'Tarea', suggestion: 'Qué hay que hacer, detalles y fecha límite.' },
  { label: 'Reunión', suggestion: 'Con quién, cargo, qué se habló y acuerdos.' },
  { label: 'Fecha', suggestion: 'Cuándo debe hacerse o cuándo fue la reunión.' },
  { label: 'Siguientes pasos', suggestion: 'Acciones concretas y fechas de seguimiento.' },
]

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

  const speechRef = useRef<SpeechRecognitionInstance | null>(null)
  const dictatedTextRef = useRef('')
  const onResultRef = useRef(options.onResult)
  onResultRef.current = options.onResult

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

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
    setDialog({ isOpen: false, mode: 'recording', items: GUIDE_ITEMS })
    dictatedTextRef.current = ''
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
    setDialog(prev => ({ ...prev, isOpen: true, mode: 'processing' }))
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

      setState('idle')
      closeDialog()
      onResultRef.current(fields)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar.'
      setError(msg)
      setState('idle')
      closeDialog()
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

  function start() {
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
      setDialog({ isOpen: true, mode: 'recording', items: GUIDE_ITEMS })
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
      closeDialog()
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
        closeDialog()
      }
    }

    speechRef.current = recognition
    try {
      recognition.start()
    } catch {
      setState('idle')
      closeDialog()
      setError('No se pudo iniciar el dictado.')
    }
  }

  return {
    state,
    error,
    speechSupported,
    dialog,
    toggle,
    handleDialogStop,
    handleDialogHide,
    reset,
  }
}
