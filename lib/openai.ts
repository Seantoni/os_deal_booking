import OpenAI from 'openai'
import { ENV } from '@/lib/config/env'

// Initialize OpenAI client using validated environment configuration
export function getOpenAIClient() {
  return new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
  })
}

