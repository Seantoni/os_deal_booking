'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export interface DictationGuideItem {
  label: string
  suggestion: string
}

export type DictationGuideMode = 'recording' | 'processing'

export interface DictationGuideDialogState {
  isOpen: boolean
  mode: DictationGuideMode
  items: DictationGuideItem[]
}

interface UseSpeechDictationAssistantArgs {
  currentText: string
  setText: Dispatch<SetStateAction<string>>
  buildGuideItems: () => DictationGuideItem[]
  processText: (text: string) => Promise<void>
  onBeforeStart?: () => void
  language?: string
}

const EMPTY_GUIDE_ITEMS: DictationGuideItem[] = []

function appendDictatedText(existing: string, dictatedChunk: string): string {
  const chunk = dictatedChunk.trim()
  if (!chunk) return existing
  if (!existing.trim()) return chunk
  const needsSeparator = /[\s\n]$/.test(existing)
  return needsSeparator ? `${existing}${chunk}` : `${existing} ${chunk}`
}

export function useSpeechDictationAssistant({
  currentText,
  setText,
  buildGuideItems,
  processText,
  onBeforeStart,
  language = 'es-PA',
}: UseSpeechDictationAssistantArgs) {
  const [dictationGuideDialog, setDictationGuideDialog] = useState<DictationGuideDialogState>({
    isOpen: false,
    mode: 'recording',
    items: EMPTY_GUIDE_ITEMS,
  })
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)
  const [showFirstDictationAnimation, setShowFirstDictationAnimation] = useState(false)

  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const dictatedTextRef = useRef(currentText)
  const autoProcessRef = useRef(false)
  const guideVisibleRef = useRef(false)
  const hasDictatedOnceRef = useRef(false)
  const firstAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAnimTimer = useCallback(() => {
    if (firstAnimTimerRef.current) {
      clearTimeout(firstAnimTimerRef.current)
      firstAnimTimerRef.current = null
    }
  }, [])

  const closeGuideDialog = useCallback(() => {
    guideVisibleRef.current = false
    setDictationGuideDialog((prev) => ({ ...prev, isOpen: false, mode: 'recording' }))
  }, [])

  useEffect(() => {
    dictatedTextRef.current = currentText
  }, [currentText])

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
  }, [clearAnimTimer])

  const resetDictationState = useCallback(() => {
    setDictationGuideDialog({ isOpen: false, mode: 'recording', items: EMPTY_GUIDE_ITEMS })
    setDictationError(null)
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
  }, [clearAnimTimer])

  const clearDictationError = useCallback(() => {
    setDictationError(null)
  }, [])

  const stopDictation = useCallback((options?: { shouldAutoProcess?: boolean }) => {
    autoProcessRef.current = options?.shouldAutoProcess ?? true
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }
  }, [])

  const startDictation = useCallback(() => {
    if (typeof window === 'undefined') return

    const guideItems = buildGuideItems()
    guideVisibleRef.current = true

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!RecognitionCtor) {
      guideVisibleRef.current = false
      setSpeechSupported(false)
      setDictationError('Este navegador no soporta dictado por voz.')
      closeGuideDialog()
      return
    }

    onBeforeStart?.()
    setDictationError(null)

    const recognition = new RecognitionCtor()
    recognition.lang = language
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

      setText((prev) => {
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
        setDictationGuideDialog((prev) => ({ ...prev, isOpen: true, mode: 'processing' }))
      }

      void (async () => {
        if (!shouldAutoProcess) {
          closeGuideDialog()
          return
        }

        try {
          const text = dictatedTextRef.current.trim()
          if (text) {
            await processText(text)
          }
        } finally {
          closeGuideDialog()
        }
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
  }, [buildGuideItems, clearAnimTimer, closeGuideDialog, language, onBeforeStart, processText, setText])

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      stopDictation()
      return
    }

    startDictation()
  }, [isDictating, startDictation, stopDictation])

  const handleGuideHide = useCallback(() => {
    closeGuideDialog()
  }, [closeGuideDialog])

  const handleGuideStopDictation = useCallback(() => {
    stopDictation({ shouldAutoProcess: true })
  }, [stopDictation])

  return {
    clearDictationError,
    dictationError,
    dictationGuideDialog,
    handleGuideHide,
    handleGuideStopDictation,
    isDictating,
    resetDictationState,
    showFirstDictationAnimation,
    speechSupported,
    toggleDictation,
  }
}
