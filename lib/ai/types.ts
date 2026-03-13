import type OpenAI from 'openai'

export type AiPresetName =
  | 'extraction'
  | 'classification'
  | 'generation'
  | 'generation-creative'
  | 'proofreading'
  | 'analysis'
  | 'lightweight'

export interface AiPreset {
  model: string
  temperature: number
  maxTokens: number
  responseFormat?: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format']
}

export interface AiCallOptions {
  preset: AiPresetName
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  temperature?: number
  maxTokens?: number
  responseFormat?: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format']
}
