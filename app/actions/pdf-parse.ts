'use server'

import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { CATEGORIES } from '@/lib/categories'

// Use pdf2json for server-side PDF parsing (Node.js friendly)
const PDFParser = require('pdf2json')

export type ParsedBookingData = {
  businessName?: string
  category?: string
  serviceProduct?: string
  description?: string
  merchant?: string
  discount?: string
  notes?: string
  suggestedStartDate?: string // Format: YYYY-MM-DD
  totalDays?: number
}

/**
 * Parse PDF and extract booking information using OpenAI
 */
export async function parsePDFForBooking(file: File): Promise<{
  success: boolean
  data?: ParsedBookingData
  error?: string
}> {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      return { success: false, error: 'Only PDF files are supported' }
    }

    // Read PDF file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse PDF using pdf2json
    const pdfParser = new PDFParser(null, true) // true = enable raw text parsing
    
    // Extract text from PDF
    const pdfText = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Check if Pages exist
          if (!pdfData.Pages || pdfData.Pages.length === 0) {
            reject(new Error('PDF has no pages or text content'))
            return
          }
          
          // Extract text from all pages
          const text = pdfData.Pages
            .map((page: any) => {
              if (!page.Texts || page.Texts.length === 0) {
                return ''
              }
              return page.Texts
                .map((textItem: any) => {
                  if (!textItem.R || textItem.R.length === 0) {
                    return ''
                  }
                  try {
                    return textItem.R
                      .map((r: any) => decodeURIComponent(r.T || ''))
                      .join(' ')
                  } catch (decodeErr) {
                    // If decoding fails, try to use raw text
                    return textItem.R.map((r: any) => r.T || '').join(' ')
                  }
                })
                .join(' ')
            })
            .join('\n')
          
          resolve(text)
        } catch (err) {
          console.error('PDF extraction error:', err)
          reject(new Error(`Failed to extract text from PDF: ${err instanceof Error ? err.message : 'Unknown error'}`))
        }
      })
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parser error:', errData)
        reject(new Error(errData.parserError || 'Failed to parse PDF'))
      })
      
      try {
        pdfParser.parseBuffer(buffer)
      } catch (parseErr) {
        console.error('Parse buffer error:', parseErr)
        reject(parseErr)
      }
    })

    if (!pdfText || pdfText.trim().length === 0) {
      return { success: false, error: 'Could not extract text from PDF. The PDF might be image-based or corrupted.' }
    }

    // Send to OpenAI for parsing
    const openai = getOpenAIClient()
    
    const categoriesList = CATEGORIES.join(', ')
    
    const prompt = `You are analyzing a PDF document for a booking/offer system. Extract the following information and return it as JSON:

Available categories (must match exactly one of these if found):
${categoriesList}

Extract and return JSON with these fields:
{
  "businessName": "Name of the business/merchant taken from the field 'Nombre del negocio' - THIS WILL BE USED AS THE EVENT NAME",
  "category": "One of the available categories listed above, or null if not found taken from the field 'Categoría'",
  "serviceProduct": "Specific service or product being offered taken from the field 'OPCIONES DE COMPRA' and 'Título de opción' header",
  "description": "Description of the offer/deal taken from the field 'Descripción' in the table",
  "merchant": "Merchant/aliado name (same as businessName if not specified separately)",
  "discount": "Discount percentage or amount mentioned",
  "notes": "Any additional relevant information, point out inconsistencies and other relevant information",
  "suggestedStartDate": "The run date/launch date/fecha de publicación in YYYY-MM-DD format (e.g., 2025-11-20). Extract from fields like 'Fecha de publicación', 'Run date', or similar",
  "totalDays": "Total number of days the offer should run (extract from 'Total de días' or similar field, as a number)"
}

Rules:
- Only use categories from the provided list
- If category is not clear, set it to null
- Extract merchant/business name clearly - this will be the main event name
- For suggestedStartDate: parse any date format and convert to YYYY-MM-DD (e.g., "20/11/2025" becomes "2025-11-20")
- For totalDays: extract the number only (e.g., "5 días" becomes 5)
- Be concise but informative
- Return valid JSON only, no additional text

PDF Content:
${pdfText.substring(0, 15000)}` // Limit to avoid token limits

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured booking information from documents. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    
    if (!content) {
      return { success: false, error: 'No response from AI' }
    }

    // Parse JSON response
    let parsedData: ParsedBookingData
    try {
      parsedData = JSON.parse(content)
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1])
      } else {
        return { success: false, error: 'Failed to parse AI response as JSON' }
      }
    }

    // Clean up the data
    const cleanedData: ParsedBookingData = {
      businessName: parsedData.businessName?.trim() || undefined,
      category: parsedData.category?.trim() || undefined,
      serviceProduct: parsedData.serviceProduct?.trim() || undefined,
      description: parsedData.description?.trim() || undefined,
      merchant: parsedData.merchant?.trim() || parsedData.businessName?.trim() || undefined,
      discount: parsedData.discount?.trim() || undefined,
      notes: parsedData.notes?.trim() || undefined,
      suggestedStartDate: parsedData.suggestedStartDate?.trim() || undefined,
      totalDays: parsedData.totalDays ? Number(parsedData.totalDays) : undefined,
    }

    return {
      success: true,
      data: cleanedData,
    }
  } catch (error) {
    console.error('PDF Parse Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

