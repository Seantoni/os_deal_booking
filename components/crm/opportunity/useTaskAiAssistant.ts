'use client'

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { useSpeechDictationAssistant, type DictationGuideItem } from '@/components/shared/useSpeechDictationAssistant'

interface ExtractedTaskFields {
  title: string | null
  notes: string | null
  dueDate: string | null
}

function buildTaskGuideItems(task: { title: string; notes: string }): DictationGuideItem[] {
  const items: DictationGuideItem[] = []

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

  const proofreadAndExtract = useCallback(async (textToProcess?: string): Promise<void> => {
    const sourceText = (textToProcess ?? task.notes).trim()
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al procesar la tarea.'
      setExtractError(msg)
      setTask.setNotes(correctedText)
    } finally {
      setIsExtracting(false)
    }
  }, [setTask, task.notes, todayDate])

  const dictation = useSpeechDictationAssistant({
    currentText: task.notes,
    setText: setTask.setNotes,
    buildGuideItems: () => buildTaskGuideItems(task),
    processText: async (text) => {
      await proofreadAndExtract(text)
    },
    onBeforeStart: () => {
      setProofreadError(null)
      setExtractError(null)
    },
  })

  const clearDictationError = dictation.clearDictationError
  const dictationError = dictation.dictationError
  const resetDictationState = dictation.resetDictationState

  const resetAssistantState = useCallback(() => {
    setProofreadError(null)
    setExtractError(null)
    setIsProofreading(false)
    setIsExtracting(false)
    resetDictationState()
  }, [resetDictationState])

  function handleNotesInputChange(value: string) {
    setTask.setNotes(value)
    if (proofreadError) setProofreadError(null)
    if (extractError) setExtractError(null)
    if (dictationError) {
      clearDictationError()
    }
  }

  const assistantActionState: 'idle' | 'dictating' | 'correcting' | 'completing' =
    dictation.isDictating
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
    dictationGuideDialog: dictation.dictationGuideDialog,
    speechSupported: dictation.speechSupported,
    isDictating: dictation.isDictating,
    dictationError,
    showFirstDictationAnimation: dictation.showFirstDictationAnimation,
    handleNotesInputChange,
    proofreadAndExtract,
    toggleDictation: dictation.toggleDictation,
    handleGuideHide: dictation.handleGuideHide,
    handleGuideStopDictation: dictation.handleGuideStopDictation,
    resetAssistantState,
  }
}
