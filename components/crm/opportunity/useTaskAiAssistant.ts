'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export interface TaskDictationGuideItem {
  label: string
  suggestion: string
}

export type TaskDictationGuideMode = 'recording' | 'processing'

export interface TaskDictationGuideDialogState {
  isOpen: boolean
  mode: TaskDictationGuideMode
  items: TaskDictationGuideItem[]
}

interface ExtractedTaskFields {
  title: string | null
  notes: string | null
  dueDate: string | null
}

const EMPTY_GUIDE_ITEMS: TaskDictationGuideItem[] = []

function appendDictatedText(existing: string, dictatedChunk: string): string {
  const chunk = dictatedChunk.trim()
  if (!chunk) return existing
  if (!existing.trim()) return chunk
  const needsSeparator = /[\s\n]$/.test(existing)
  return needsSeparator ? `${existing}${chunk}` : `${existing} ${chunk}`
}

function buildTaskGuideItems(task: { title: string; notes: string }): TaskDictationGuideItem[] {
  const items: TaskDictationGuideItem[] = []

  if (!task.title.trim()) {
    items.push({ label: 'Tarea', suggestion: 'Describa qué hay que hacer de forma clara.' })
  }

  if (!task.notes.trim()) {
    items.push({ label: 'Detalles', suggestion: 'Contexto adicional, responsables u observaciones.' })
  }

  items.push({ label: 'Fecha límite', suggestion: 'Si aplica, mencione cuándo debe completarse.' })

  if (items.length === 0) {
    items.push({ label: 'Contexto', suggestion: 'Agregue más detalles para completar la tarea.' })
  }

  return items
}

interface UseTaskAiAssistantArgs {
  task: {
    title: string
    notes: string
    date: string
  }
  setTask: {
    setTitle: Dispatch<SetStateAction<string>>
    setNotes: Dispatch<SetStateAction<string>>
    setDate: Dispatch<SetStateAction<string>>
  }
  todayDate: string
}

export function useTaskAiAssistant({ task, setTask, todayDate }: UseTaskAiAssistantArgs) {
  const [isProofreading, setIsProofreading] = useState(false)
  const [proofreadError, setProofreadError] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [dictationGuideDialog, setDictationGuideDialog] = useState<TaskDictationGuideDialogState>({
    isOpen: false,
    mode: 'recording',
    items: EMPTY_GUIDE_ITEMS,
  })
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)
  const [showFirstDictationAnimation, setShowFirstDictationAnimation] = useState(false)

  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const dictatedTextRef = useRef('')
  const autoProcessRef = useRef(false)
  const guideVisibleRef = useRef(false)
  const hasDictatedOnceRef = useRef(false)
  const firstAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearAnimTimer() {
    if (firstAnimTimerRef.current) {
      clearTimeout(firstAnimTimerRef.current)
      firstAnimTimerRef.current = null
    }
  }

  function closeGuideDialog() {
    guideVisibleRef.current = false
    setDictationGuideDialog(prev => ({ ...prev, isOpen: false, mode: 'recording' }))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
    return () => {
      clearAnimTimer()
      autoProcessRef.current = false
      guideVisibleRef.current = false
      hasDictatedOnceRef.current = false
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort()
        speechRecognitionRef.current = null
      }
    }
  }, [])

  const resetAssistantState = useCallback(() => {
    setProofreadError(null)
    setExtractError(null)
    setDictationGuideDialog({ isOpen: false, mode: 'recording', items: EMPTY_GUIDE_ITEMS })
    setDictationError(null)
    setIsProofreading(false)
    setIsExtracting(false)
    setIsDictating(false)
    setShowFirstDictationAnimation(false)
    autoProcessRef.current = false
    guideVisibleRef.current = false
    hasDictatedOnceRef.current = false
    dictatedTextRef.current = ''
    clearAnimTimer()
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort()
      speechRecognitionRef.current = null
    }
  }, [])

  async function proofreadAndExtract(textToProcess?: string): Promise<void> {
    const sourceText = (textToProcess ?? dictatedTextRef.current).trim()
    if (!sourceText) return

    setProofreadError(null)
    setExtractError(null)
    setIsProofreading(true)

    let correctedText = sourceText

    try {
      const proofRes = await fetch('/api/ai/proofread-task-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText }),
      })
      const proofData = await proofRes.json().catch(() => null)
      if (proofRes.ok && proofData?.text && typeof proofData.text === 'string') {
        correctedText = proofData.text.trim() || sourceText
      }
    } catch {
      // Continue with original text if proofread fails
    } finally {
      setIsProofreading(false)
    }

    setIsExtracting(true)
    try {
      const extractRes = await fetch('/api/ai/extract-task-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: correctedText, todayDate }),
      })
      const extractData = await extractRes.json().catch(() => null)
      if (!extractRes.ok) {
        const msg = extractData?.error && typeof extractData.error === 'string'
          ? extractData.error
          : 'No se pudieron extraer los campos.'
        throw new Error(msg)
      }

      const fields = extractData?.fields as ExtractedTaskFields | undefined
      if (!fields || typeof fields !== 'object') {
        throw new Error('Respuesta inválida del extractor.')
      }

      if (fields.title) {
        setTask.setTitle(fields.title)
      }
      if (fields.dueDate) {
        setTask.setDate(fields.dueDate)
      }
      setTask.setNotes(fields.notes ?? correctedText)
      dictatedTextRef.current = fields.notes ?? correctedText
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al procesar la tarea.'
      setExtractError(msg)
      setTask.setNotes(correctedText)
      dictatedTextRef.current = correctedText
    } finally {
      setIsExtracting(false)
    }
  }

  function handleNotesInputChange(value: string) {
    setTask.setNotes(value)
    dictatedTextRef.current = value
    if (proofreadError) setProofreadError(null)
    if (extractError) setExtractError(null)
    if (dictationError) setDictationError(null)
  }

  function stopDictation(options?: { shouldAutoProcess?: boolean }) {
    autoProcessRef.current = options?.shouldAutoProcess ?? true
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }
  }

  function startDictation() {
    if (typeof window === 'undefined') return

    const guideItems = buildTaskGuideItems(task)
    guideVisibleRef.current = true

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!RecognitionCtor) {
      guideVisibleRef.current = false
      setSpeechSupported(false)
      setDictationError('Este navegador no soporta dictado por voz.')
      closeGuideDialog()
      return
    }

    setDictationError(null)
    setProofreadError(null)
    setExtractError(null)

    const recognition = new RecognitionCtor()
    recognition.lang = 'es-PA'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      autoProcessRef.current = true
      setIsDictating(true)
      if (!hasDictatedOnceRef.current) {
        hasDictatedOnceRef.current = true
        setShowFirstDictationAnimation(true)
        clearAnimTimer()
        firstAnimTimerRef.current = setTimeout(() => {
          setShowFirstDictationAnimation(false)
          firstAnimTimerRef.current = null
        }, 2500)
      }
      if (guideVisibleRef.current) {
        setDictationGuideDialog({ isOpen: true, mode: 'recording', items: guideItems })
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
      if (!finalChunk.trim()) return
      setTask.setNotes((prev) => {
        const nextValue = appendDictatedText(prev, finalChunk)
        dictatedTextRef.current = nextValue
        return nextValue
      })
    }

    recognition.onerror = (event) => {
      const errorCode = event.error || 'unknown'
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed' || errorCode === 'audio-capture') {
        autoProcessRef.current = false
      }
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        setDictationError('Permiso de micrófono denegado. Habilítelo en su navegador.')
      } else if (errorCode === 'no-speech') {
        setDictationError('No se detectó voz. Intente nuevamente.')
      } else if (errorCode === 'audio-capture') {
        setDictationError('No se pudo acceder al micrófono del dispositivo.')
      } else {
        setDictationError('Se interrumpió el dictado. Intente de nuevo.')
      }
      closeGuideDialog()
    }

    recognition.onend = () => {
      const shouldAutoProcess = autoProcessRef.current
      const shouldShowGuide = guideVisibleRef.current

      setIsDictating(false)
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null
      }
      autoProcessRef.current = false

      if (shouldAutoProcess && shouldShowGuide) {
        setDictationGuideDialog(prev => ({ ...prev, isOpen: true, mode: 'processing' }))
      }

      void (async () => {
        if (!shouldAutoProcess) {
          closeGuideDialog()
          return
        }

        const text = dictatedTextRef.current.trim()
        if (text) {
          await proofreadAndExtract(text)
        }
        closeGuideDialog()
      })()
    }

    speechRecognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      guideVisibleRef.current = false
      setIsDictating(false)
      setDictationError('No se pudo iniciar el dictado. Intente nuevamente.')
      closeGuideDialog()
    }
  }

  function toggleDictation() {
    if (isDictating) {
      stopDictation()
    } else {
      startDictation()
    }
  }

  function handleGuideHide() {
    closeGuideDialog()
  }

  function handleGuideStopDictation() {
    stopDictation({ shouldAutoProcess: true })
  }

  const assistantActionState: 'idle' | 'dictating' | 'correcting' | 'completing' =
    isDictating
      ? 'dictating'
      : isExtracting
        ? 'completing'
        : isProofreading
          ? 'correcting'
          : 'idle'

  return {
    assistantActionState,
    proofreadError,
    extractError,
    dictationGuideDialog,
    speechSupported,
    isDictating,
    dictationError,
    showFirstDictationAnimation,
    handleNotesInputChange,
    proofreadAndExtract,
    toggleDictation,
    handleGuideHide,
    handleGuideStopDictation,
    resetAssistantState,
  }
}
