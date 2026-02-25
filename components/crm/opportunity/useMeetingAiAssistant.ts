'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

interface ExtractedMeetingFields {
  meetingWith: string | null
  position: string | null
  isDecisionMaker: '' | 'si' | 'no' | 'no_se' | null
  meetingHappened: '' | 'si' | 'no' | null
  reachedAgreement: 'si' | 'no' | null
  mainObjection: string | null
  objectionSolution: string | null
  nextSteps: string | null
}

const MEETING_FIELD_LABELS: Record<keyof ExtractedMeetingFields, string> = {
  meetingWith: 'Nombre del contacto',
  position: 'Posición o cargo',
  isDecisionMaker: 'Tomador de decisión',
  meetingHappened: 'Estado de la reunión',
  reachedAgreement: 'Acuerdo alcanzado',
  mainObjection: 'Objeción principal',
  objectionSolution: 'Solución a la objeción',
  nextSteps: 'Siguientes pasos',
}

type MissingDialogMode = 'missing' | 'recording' | 'processing'

interface MissingFieldsSummary {
  missingRequired: string[]
  notDetected: string[]
}

export interface MissingFieldsDialogState extends MissingFieldsSummary {
  isOpen: boolean
  mode: MissingDialogMode
}

interface ExtractionResult {
  success: boolean
  missing: MissingFieldsSummary
}

type DictationGuideDialogMode = 'recording' | 'processing'

export interface DictationGuideItem {
  label: string
  suggestion: string
}

export interface DictationGuideDialogState {
  isOpen: boolean
  mode: DictationGuideDialogMode
  items: DictationGuideItem[]
}

const EMPTY_MISSING_FIELDS: MissingFieldsSummary = {
  missingRequired: [],
  notDetected: [],
}

const EMPTY_DICTATION_GUIDE_ITEMS: DictationGuideItem[] = []

function appendDictatedText(existing: string, dictatedChunk: string): string {
  const chunk = dictatedChunk.trim()
  if (!chunk) return existing
  if (!existing.trim()) return chunk
  const needsSeparator = /[\s\n]$/.test(existing)
  return needsSeparator ? `${existing}${chunk}` : `${existing} ${chunk}`
}

function buildDictationGuideItems(params: {
  meeting: UseMeetingAiAssistantArgs['meeting']
  forCompletion: boolean
  isDatePast: boolean
  isDateToday: boolean
}): DictationGuideItem[] {
  const { meeting, forCompletion, isDatePast, isDateToday } = params
  const items: DictationGuideItem[] = []

  // For the guide, show outcome items whenever the meeting could have already happened.
  // The user may mention outcomes naturally and the AI will extract them,
  // even if the outcome section isn't visible yet (e.g. meetingHappened is still '').
  const couldHaveOutcome = forCompletion || isDatePast || isDateToday

  if (!meeting.meetingWith.trim()) {
    items.push({ label: 'Reunión con', suggestion: 'Nombre de la persona con quien se reunió.' })
  }

  if (!meeting.position.trim()) {
    items.push({ label: 'Posición', suggestion: 'Cargo o rol en la empresa.' })
  }

  if (!meeting.isDecisionMaker) {
    items.push({ label: 'Tomador de decisión', suggestion: '¿Es quien toma la decisión final?' })
  }

  if (isDateToday && !meeting.meetingHappened) {
    items.push({ label: 'Estado', suggestion: '¿La reunión ya se realizó o está pendiente?' })
  }

  if (!meeting.meetingDetails.trim()) {
    items.push({ label: 'Detalle', suggestion: 'Qué se habló, intereses del cliente y contexto.' })
  }

  if (couldHaveOutcome) {
    items.push({ label: 'Acuerdo', suggestion: '¿Se llegó a un acuerdo o no?' })

    if (!meeting.nextSteps.trim()) {
      items.push({ label: 'Siguientes pasos', suggestion: 'Acciones concretas y fechas de seguimiento.' })
    }

    if (!meeting.mainObjection.trim()) {
      items.push({ label: 'Objeción', suggestion: 'Si no hubo acuerdo, cuál fue la barrera principal.' })
    }

    if (!meeting.objectionSolution.trim()) {
      items.push({ label: 'Solución', suggestion: 'Si hubo objeción, cómo se podría resolver.' })
    }
  }

  if (items.length === 0) {
    items.push({ label: 'Contexto', suggestion: 'Agregue más detalles para completar el registro.' })
  }

  return items
}

interface UseMeetingAiAssistantArgs {
  meeting: {
    meetingWith: string
    position: string
    isDecisionMaker: '' | 'si' | 'no' | 'no_se'
    meetingDetails: string
    meetingHappened: '' | 'si' | 'no'
    reachedAgreement: 'si' | 'no'
    mainObjection: string
    objectionSolution: string
    nextSteps: string
  }
  setMeeting: {
    setMeetingWith: Dispatch<SetStateAction<string>>
    setPosition: Dispatch<SetStateAction<string>>
    setIsDecisionMaker: Dispatch<SetStateAction<'' | 'si' | 'no' | 'no_se'>>
    setMeetingDetails: Dispatch<SetStateAction<string>>
    setMeetingHappened: Dispatch<SetStateAction<'' | 'si' | 'no'>>
    setReachedAgreement: Dispatch<SetStateAction<'si' | 'no'>>
    setMainObjection: Dispatch<SetStateAction<string>>
    setObjectionSolution: Dispatch<SetStateAction<string>>
    setNextSteps: Dispatch<SetStateAction<string>>
  }
  forCompletion: boolean
  isDatePast: boolean
  isDateToday: boolean
  setValidationError: Dispatch<SetStateAction<string | null>>
}

export function useMeetingAiAssistant({
  meeting,
  setMeeting,
  forCompletion,
  isDatePast,
  isDateToday,
  setValidationError,
}: UseMeetingAiAssistantArgs) {
  const [isAiImprovingMeetingDetails, setIsAiImprovingMeetingDetails] = useState(false)
  const [aiMeetingDetailsError, setAiMeetingDetailsError] = useState<string | null>(null)
  const [isAiPrefillingMeetingFields, setIsAiPrefillingMeetingFields] = useState(false)
  const [aiMeetingPrefillError, setAiMeetingPrefillError] = useState<string | null>(null)
  const [missingFieldsDialog, setMissingFieldsDialog] = useState<MissingFieldsDialogState>({
    isOpen: false,
    mode: 'missing',
    ...EMPTY_MISSING_FIELDS,
  })
  const [dictationGuideDialog, setDictationGuideDialog] = useState<DictationGuideDialogState>({
    isOpen: false,
    mode: 'recording',
    items: EMPTY_DICTATION_GUIDE_ITEMS,
  })
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isDictatingMeetingDetails, setIsDictatingMeetingDetails] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)
  const [showFirstDictationAnimation, setShowFirstDictationAnimation] = useState(false)

  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const meetingDetailsRef = useRef(meeting.meetingDetails)
  const autoProofreadAfterDictationRef = useRef(false)
  const dictationRequestedFromMissingDialogRef = useRef(false)
  const dictationGuideVisibleRef = useRef(false)
  const hasDictatedOnceRef = useRef(false)
  const firstDictationAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearFirstDictationAnimationTimer() {
    if (firstDictationAnimationTimerRef.current) {
      clearTimeout(firstDictationAnimationTimerRef.current)
      firstDictationAnimationTimerRef.current = null
    }
  }

  function closeMissingFieldsDialog() {
    setMissingFieldsDialog({
      isOpen: false,
      mode: 'missing',
      ...EMPTY_MISSING_FIELDS,
    })
  }

  function closeDictationGuideDialog() {
    dictationGuideVisibleRef.current = false
    setDictationGuideDialog(prev => ({
      ...prev,
      isOpen: false,
      mode: 'recording',
    }))
  }

  function openMissingFieldsDialog(missing: MissingFieldsSummary, mode: MissingDialogMode = 'missing') {
    setMissingFieldsDialog({
      isOpen: true,
      mode,
      missingRequired: missing.missingRequired,
      notDetected: missing.notDetected,
    })
  }

  function hasMissingFields(missing: MissingFieldsSummary): boolean {
    return missing.missingRequired.length > 0 || missing.notDetected.length > 0
  }

  function getMissingAfterAutofill(
    merged: {
      meetingWith: string
      position: string
      isDecisionMaker: '' | 'si' | 'no' | 'no_se'
      reachedAgreement: 'si' | 'no'
      mainObjection: string
      objectionSolution: string
      nextSteps: string
      meetingHappened: '' | 'si' | 'no'
    },
    extracted: ExtractedMeetingFields
  ): MissingFieldsSummary {
    const missingRequired: string[] = []
    const notDetected: string[] = []

    if (!merged.meetingWith.trim()) {
      missingRequired.push(MEETING_FIELD_LABELS.meetingWith)
    }
    if (!merged.position.trim()) {
      missingRequired.push(MEETING_FIELD_LABELS.position)
    }
    if (!merged.isDecisionMaker && extracted.isDecisionMaker === null) {
      notDetected.push(MEETING_FIELD_LABELS.isDecisionMaker)
    }

    const showOutcomeForMerged =
      forCompletion || isDatePast || (isDateToday && merged.meetingHappened === 'si')

    if (showOutcomeForMerged) {
      if (!merged.nextSteps.trim()) {
        missingRequired.push(MEETING_FIELD_LABELS.nextSteps)
      }

      if (extracted.reachedAgreement === null) {
        notDetected.push(MEETING_FIELD_LABELS.reachedAgreement)
      }

      if (merged.reachedAgreement === 'no') {
        if (!merged.mainObjection.trim()) {
          missingRequired.push(MEETING_FIELD_LABELS.mainObjection)
        }
        if (!merged.objectionSolution.trim()) {
          missingRequired.push(MEETING_FIELD_LABELS.objectionSolution)
        }
      }
    }

    if (!merged.meetingWith.trim() && extracted.meetingWith === null) {
      notDetected.push(MEETING_FIELD_LABELS.meetingWith)
    }
    if (!merged.position.trim() && extracted.position === null) {
      notDetected.push(MEETING_FIELD_LABELS.position)
    }
    if (showOutcomeForMerged && !merged.nextSteps.trim() && extracted.nextSteps === null) {
      notDetected.push(MEETING_FIELD_LABELS.nextSteps)
    }

    return {
      missingRequired: Array.from(new Set(missingRequired)),
      notDetected: Array.from(new Set(notDetected)),
    }
  }

  function applyExtractedMeetingFields(fields: ExtractedMeetingFields) {
    if (fields.meetingWith) {
      setMeeting.setMeetingWith(fields.meetingWith)
    }
    if (fields.position) {
      setMeeting.setPosition(fields.position)
    }
    if (fields.isDecisionMaker) {
      setMeeting.setIsDecisionMaker(fields.isDecisionMaker)
    }
    if (fields.meetingHappened) {
      setMeeting.setMeetingHappened(fields.meetingHappened)
    }
    if (fields.reachedAgreement) {
      setMeeting.setReachedAgreement(fields.reachedAgreement)
    }
    if (fields.mainObjection) {
      setMeeting.setMainObjection(fields.mainObjection)
    }
    if (fields.objectionSolution) {
      setMeeting.setObjectionSolution(fields.objectionSolution)
    }
    if (fields.nextSteps) {
      setMeeting.setNextSteps(fields.nextSteps)
    }
  }

  useEffect(() => {
    meetingDetailsRef.current = meeting.meetingDetails
  }, [meeting.meetingDetails])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))

    return () => {
      clearFirstDictationAnimationTimer()
      autoProofreadAfterDictationRef.current = false
      dictationRequestedFromMissingDialogRef.current = false
      dictationGuideVisibleRef.current = false
      hasDictatedOnceRef.current = false
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort()
        speechRecognitionRef.current = null
      }
    }
  }, [])

  const resetAssistantState = useCallback(() => {
    setAiMeetingDetailsError(null)
    setAiMeetingPrefillError(null)
    setMissingFieldsDialog({
      isOpen: false,
      mode: 'missing',
      ...EMPTY_MISSING_FIELDS,
    })
    setDictationGuideDialog({
      isOpen: false,
      mode: 'recording',
      items: EMPTY_DICTATION_GUIDE_ITEMS,
    })
    setDictationError(null)
    setIsAiImprovingMeetingDetails(false)
    setIsAiPrefillingMeetingFields(false)
    setIsDictatingMeetingDetails(false)
    setShowFirstDictationAnimation(false)
    autoProofreadAfterDictationRef.current = false
    dictationRequestedFromMissingDialogRef.current = false
    dictationGuideVisibleRef.current = false
    hasDictatedOnceRef.current = false
    clearFirstDictationAnimationTimer()
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort()
      speechRecognitionRef.current = null
    }
  }, [])

  function handleMeetingDetailsInputChange(value: string) {
    setMeeting.setMeetingDetails(value)
    meetingDetailsRef.current = value
    if (aiMeetingDetailsError) setAiMeetingDetailsError(null)
    if (aiMeetingPrefillError) setAiMeetingPrefillError(null)
    if (dictationError) setDictationError(null)
  }

  async function extractMeetingFieldsFromText(
    textToExtract: string,
    options?: {
      openDialogOnMissing?: boolean
    }
  ): Promise<ExtractionResult> {
    const sourceText = textToExtract.trim()
    if (!sourceText) {
      setAiMeetingPrefillError('Ingrese el detalle de la reunión antes de autocompletar.')
      return {
        success: false,
        missing: { ...EMPTY_MISSING_FIELDS },
      }
    }

    setAiMeetingPrefillError(null)
    setValidationError(null)
    setIsAiPrefillingMeetingFields(true)

    try {
      const response = await fetch('/api/ai/extract-meeting-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMessage =
          data?.error && typeof data.error === 'string'
            ? data.error
            : 'No se pudieron autocompletar los campos.'
        throw new Error(errorMessage)
      }

      const fields = data?.fields as ExtractedMeetingFields | undefined
      if (!fields || typeof fields !== 'object') {
        throw new Error('No se recibió información válida para autocompletar.')
      }

      applyExtractedMeetingFields(fields)
      const merged = {
        meetingWith: fields.meetingWith ?? meeting.meetingWith,
        position: fields.position ?? meeting.position,
        isDecisionMaker: fields.isDecisionMaker ?? meeting.isDecisionMaker,
        reachedAgreement: fields.reachedAgreement ?? meeting.reachedAgreement,
        mainObjection: fields.mainObjection ?? meeting.mainObjection,
        objectionSolution: fields.objectionSolution ?? meeting.objectionSolution,
        nextSteps: fields.nextSteps ?? meeting.nextSteps,
        meetingHappened: fields.meetingHappened ?? meeting.meetingHappened,
      }
      const missing = getMissingAfterAutofill(merged, fields)
      if (hasMissingFields(missing) && options?.openDialogOnMissing !== false) {
        openMissingFieldsDialog(missing, 'missing')
      }
      return {
        success: true,
        missing,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al autocompletar campos de la reunión.'
      setAiMeetingPrefillError(errorMessage)
      return {
        success: false,
        missing: { ...EMPTY_MISSING_FIELDS },
      }
    } finally {
      setIsAiPrefillingMeetingFields(false)
    }
  }

  async function handlePrefillMeetingFieldsFromDetails(
    options?: {
      openDialogOnMissing?: boolean
    }
  ) {
    const sourceText = meetingDetailsRef.current.trim()
    if (!sourceText) {
      setAiMeetingPrefillError('Ingrese el detalle de la reunión antes de autocompletar.')
      return {
        success: false,
        missing: { ...EMPTY_MISSING_FIELDS },
      }
    }
    return extractMeetingFieldsFromText(sourceText, options)
  }

  async function handleProofreadMeetingDetails(
    textToProofread?: string,
    options?: {
      openDialogOnMissing?: boolean
    }
  ): Promise<ExtractionResult> {
    const sourceText = (textToProofread ?? meetingDetailsRef.current).trim()
    if (!sourceText) {
      setAiMeetingDetailsError('Ingrese el detalle de la reunión antes de corregir con IA.')
      return {
        success: false,
        missing: { ...EMPTY_MISSING_FIELDS },
      }
    }

    setAiMeetingDetailsError(null)
    setValidationError(null)
    setIsAiImprovingMeetingDetails(true)

    try {
      const response = await fetch('/api/ai/proofread-meeting-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMessage =
          data?.error && typeof data.error === 'string'
            ? data.error
            : 'No se pudo corregir el texto.'
        throw new Error(errorMessage)
      }

      const correctedText =
        data?.text && typeof data.text === 'string' ? data.text.trim() : ''
      if (!correctedText) {
        throw new Error('No se recibió una corrección válida.')
      }

      setMeeting.setMeetingDetails(correctedText)
      meetingDetailsRef.current = correctedText
      return extractMeetingFieldsFromText(correctedText, options)
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al corregir el detalle con IA.'
      setAiMeetingDetailsError(errorMessage)
      return {
        success: false,
        missing: { ...EMPTY_MISSING_FIELDS },
      }
    } finally {
      setIsAiImprovingMeetingDetails(false)
    }
  }

  function stopMeetingDetailsDictation(options?: { shouldAutoProcess?: boolean }) {
    autoProofreadAfterDictationRef.current = options?.shouldAutoProcess ?? true
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }
  }

  function startMeetingDetailsDictation(options?: { fromMissingDialog?: boolean }) {
    if (typeof window === 'undefined') return

    const fromMissingDialog = Boolean(options?.fromMissingDialog)
    const dictationGuideItems = fromMissingDialog
      ? EMPTY_DICTATION_GUIDE_ITEMS
      : buildDictationGuideItems({
          meeting,
          forCompletion,
          isDatePast,
          isDateToday,
        })

    if (fromMissingDialog) {
      dictationRequestedFromMissingDialogRef.current = true
      setMissingFieldsDialog(prev => ({
        ...prev,
        isOpen: true,
        mode: 'recording',
      }))
    } else {
      dictationGuideVisibleRef.current = true
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!RecognitionCtor) {
      dictationRequestedFromMissingDialogRef.current = false
      dictationGuideVisibleRef.current = false
      setSpeechSupported(false)
      setDictationError('Este navegador no soporta dictado por voz.')
      if (fromMissingDialog) {
        setMissingFieldsDialog(prev => ({
          ...prev,
          isOpen: true,
          mode: 'missing',
        }))
      } else {
        closeDictationGuideDialog()
      }
      return
    }

    setDictationError(null)
    setValidationError(null)
    setAiMeetingPrefillError(null)

    const recognition = new RecognitionCtor()
    recognition.lang = 'es-PA'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      autoProofreadAfterDictationRef.current = true
      setIsDictatingMeetingDetails(true)
      if (!hasDictatedOnceRef.current) {
        hasDictatedOnceRef.current = true
        setShowFirstDictationAnimation(true)
        clearFirstDictationAnimationTimer()
        firstDictationAnimationTimerRef.current = setTimeout(() => {
          setShowFirstDictationAnimation(false)
          firstDictationAnimationTimerRef.current = null
        }, 2500)
      }
      if (fromMissingDialog) {
        setMissingFieldsDialog(prev => ({
          ...prev,
          isOpen: true,
          mode: 'recording',
        }))
      } else if (dictationGuideVisibleRef.current) {
        setDictationGuideDialog({
          isOpen: true,
          mode: 'recording',
          items: dictationGuideItems,
        })
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
      setMeeting.setMeetingDetails((prev) => {
        const nextValue = appendDictatedText(prev, finalChunk)
        meetingDetailsRef.current = nextValue
        return nextValue
      })
    }

    recognition.onerror = (event) => {
      const errorCode = event.error || 'unknown'
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed' || errorCode === 'audio-capture') {
        autoProofreadAfterDictationRef.current = false
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

      if (fromMissingDialog) {
        setMissingFieldsDialog(prev => ({
          ...prev,
          isOpen: true,
          mode: 'missing',
        }))
      } else {
        closeDictationGuideDialog()
      }
    }

    recognition.onend = () => {
      const fromDialogFlow = dictationRequestedFromMissingDialogRef.current
      const shouldAutoProcess = autoProofreadAfterDictationRef.current
      const shouldShowGuideDialog = dictationGuideVisibleRef.current

      setIsDictatingMeetingDetails(false)
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null
      }
      autoProofreadAfterDictationRef.current = false

      if (fromDialogFlow && shouldAutoProcess) {
        setMissingFieldsDialog(prev => ({
          ...prev,
          isOpen: true,
          mode: 'processing',
        }))
      } else if (!fromDialogFlow && shouldAutoProcess && shouldShowGuideDialog) {
        setDictationGuideDialog(prev => ({
          ...prev,
          isOpen: true,
          mode: 'processing',
        }))
      }

      void (async () => {
        let result: ExtractionResult = {
          success: true,
          missing: { ...EMPTY_MISSING_FIELDS },
        }

        if (!shouldAutoProcess) {
          if (fromDialogFlow) {
            dictationRequestedFromMissingDialogRef.current = false
            setMissingFieldsDialog(prev => ({
              ...prev,
              isOpen: true,
              mode: 'missing',
            }))
          } else {
            closeDictationGuideDialog()
          }
          return
        }

        const textForProofread = meetingDetailsRef.current.trim()
        if (textForProofread) {
          result = await handleProofreadMeetingDetails(textForProofread, {
            openDialogOnMissing: !fromDialogFlow,
          })
        } else {
          result = {
            success: false,
            missing: { ...EMPTY_MISSING_FIELDS },
          }
        }

        if (!fromDialogFlow) {
          closeDictationGuideDialog()
          return
        }

        dictationRequestedFromMissingDialogRef.current = false

        if (!result.success) {
          setMissingFieldsDialog(prev => ({
            ...prev,
            isOpen: true,
            mode: 'missing',
          }))
          return
        }

        if (hasMissingFields(result.missing)) {
          openMissingFieldsDialog(result.missing, 'missing')
          return
        }

        closeMissingFieldsDialog()
      })()
    }

    speechRecognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      dictationRequestedFromMissingDialogRef.current = false
      dictationGuideVisibleRef.current = false
      setIsDictatingMeetingDetails(false)
      setDictationError('No se pudo iniciar el dictado. Intente nuevamente.')
      if (fromMissingDialog) {
        setMissingFieldsDialog(prev => ({
          ...prev,
          isOpen: true,
          mode: 'missing',
        }))
      } else {
        closeDictationGuideDialog()
      }
    }
  }

  function toggleMeetingDetailsDictation() {
    if (isDictatingMeetingDetails) {
      stopMeetingDetailsDictation()
    } else {
      startMeetingDetailsDictation()
    }
  }

  function handleDictationGuideHide() {
    closeDictationGuideDialog()
  }

  function handleDictationGuideStopDictation() {
    stopMeetingDetailsDictation({ shouldAutoProcess: true })
  }

  function handleMissingFieldsManual() {
    dictationRequestedFromMissingDialogRef.current = false
    if (isDictatingMeetingDetails && speechRecognitionRef.current) {
      stopMeetingDetailsDictation({ shouldAutoProcess: false })
    }
    closeMissingFieldsDialog()
  }

  function handleMissingFieldsDictate() {
    if (!speechSupported) {
      setDictationError('Dictado no disponible en este navegador.')
      return
    }
    startMeetingDetailsDictation({ fromMissingDialog: true })
  }

  function handleMissingFieldsStopDictation() {
    stopMeetingDetailsDictation({ shouldAutoProcess: true })
  }

  return {
    isAiImprovingMeetingDetails,
    aiMeetingDetailsError,
    isAiPrefillingMeetingFields,
    aiMeetingPrefillError,
    missingFieldsDialog,
    dictationGuideDialog,
    speechSupported,
    isDictatingMeetingDetails,
    dictationError,
    showFirstDictationAnimation,
    handleMeetingDetailsInputChange,
    handleProofreadMeetingDetails,
    handlePrefillMeetingFieldsFromDetails,
    toggleMeetingDetailsDictation,
    handleDictationGuideHide,
    handleDictationGuideStopDictation,
    handleMissingFieldsManual,
    handleMissingFieldsDictate,
    handleMissingFieldsStopDictation,
    resetAssistantState,
  }
}
