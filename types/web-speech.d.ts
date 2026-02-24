export {}

declare global {
  interface SpeechRecognitionResultLike {
    isFinal: boolean
    [index: number]: {
      transcript: string
      confidence?: number
    }
  }

  interface SpeechRecognitionEventLike extends Event {
    resultIndex: number
    results: ArrayLike<SpeechRecognitionResultLike>
  }

  interface SpeechRecognitionErrorEventLike extends Event {
    error?: string
    message?: string
  }

  interface SpeechRecognitionInstance {
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    onstart: ((event: Event) => void) | null
    onend: ((event: Event) => void) | null
    onresult: ((event: SpeechRecognitionEventLike) => void) | null
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
    start: () => void
    stop: () => void
    abort: () => void
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}
