import OpenAI from 'openai'

// Initialize OpenAI client
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables')
  }
  
  return new OpenAI({
    apiKey: apiKey,
  })
}

