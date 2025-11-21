'use server'

import { auth } from '@clerk/nextjs/server'
import { getOpenAIClient } from '@/lib/openai'
import { getCategoryHierarchy, getCategoryOptions } from '@/lib/categories'

// Use pdf2json for server-side PDF parsing (Node.js friendly)
const PDFParser = require('pdf2json')

export type ParsedBookingData = {
  name?: string
  businessName?: string
  businessEmail?: string
  category?: string
  parentCategory?: string
  subCategory1?: string
  subCategory2?: string
  subCategory3?: string
  serviceProduct?: string
  description?: string
  merchant?: string
  discount?: string
  notes?: string
  suggestedStartDate?: string // Format: YYYY-MM-DD
  suggestedEndDate?: string // Format: YYYY-MM-DD
  totalDays?: number
}

/**
 * Format category hierarchy for AI prompt
 */
function formatCategoryHierarchyForPrompt(): string {
  const hierarchy = getCategoryHierarchy()
  let formatted = ''
  
  for (const main in hierarchy) {
    formatted += `\n${main}\n`
    const subs = hierarchy[main]
    if (Object.keys(subs).length === 0) {
      formatted += `  - (no subcategories, use: "${main}")\n`
    } else {
      for (const sub in subs) {
        const leaves = subs[sub]
        if (leaves.length > 0) {
          formatted += `  └─ ${sub}\n`
          leaves.forEach(leaf => {
            formatted += `     └─ ${leaf} (use: "${main} > ${sub} > ${leaf}")\n`
          })
        } else {
          formatted += `  └─ ${sub} (use: "${main} > ${sub}")\n`
        }
      }
    }
  }
  
  return formatted
}

/**
 * Format category options as a simple list for AI
 */
function formatCategoryOptionsForPrompt(): string {
  const options = getCategoryOptions()
  // Format as a numbered list for easier parsing
  return options.map((opt, idx) => `${idx + 1}. ${opt.label}`).join('\n')
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
    
    // Format categories for AI prompt
    const categoryHierarchy = formatCategoryHierarchyForPrompt()
    const categoryList = formatCategoryOptionsForPrompt()
    
    const prompt = `You are analyzing a PDF document for a booking/offer system. Extract the following information and return it as JSON.

AVAILABLE CATEGORIES:
The categories follow a hierarchical structure: MAIN CATEGORY > SUB CATEGORY > SPECIFIC ITEM

Full category hierarchy structure:
${categoryHierarchy}

All available category paths (choose the most specific match from this list):
${categoryList}

Extract and return JSON with these fields (ALL FIELDS ARE REQUIRED - use null if not found):
{
  "businessName": "Name of the business/merchant taken from the field 'Nombre del negocio' - THIS WILL BE USED AS THE EVENT NAME",
  "category": "**REQUIRED** - A category from the list above in the format 'MAIN > SUB > ITEM' or 'MAIN > SUB' or just 'MAIN'. MUST match one of the exact paths from the 'All available category paths' list. Use the most specific match possible. Examples: 'HOTELES > Hotel de Playa > Todo Incluido' or 'RESTAURANTES > Comida Local > Ceviche / Sancocho' or 'GIMNASIOS & FITNESS > Membresía Mensual Ilimitada'. Look for keywords like 'hotel', 'restaurant', 'gym', 'spa', 'beauty', etc. and match to the closest category path. If absolutely no match is possible, use null.",
  "serviceProduct": "Specific service or product being offered taken from the field 'OPCIONES DE COMPRA' and 'Título de opción' header",
  "description": "Description of the offer/deal taken from the field 'Descripción' in the table",
  "merchant": "Merchant/aliado name (same as businessName if not specified separately)",
  "discount": "Discount percentage or amount mentioned",
  "notes": "Any additional relevant information, point out inconsistencies and other relevant information",
  "suggestedStartDate": "The run date/launch date/fecha de publicación in YYYY-MM-DD format (e.g., 2025-11-20). Extract from fields like 'Fecha de publicación', 'Run date', or similar",
  "totalDays": "Total number of days the offer should run (extract from 'Total de días' or similar field, as a number)"
}

CRITICAL RULES FOR CATEGORY SELECTION:
- ALWAYS try to match a category - it's better to make a best guess than return null
- Use the EXACT format shown in the category paths list above (e.g., "MAIN > SUB > ITEM" or "MAIN > SUB")
- Match the most specific category path available (prefer 3-level paths like "MAIN > SUB > ITEM")
- If you can't find an exact match, try a 2-level path (MAIN > SUB) or just the main category
- Try to match even if the wording is slightly different - look for similar concepts
- Categories are case-sensitive - match the exact casing from the list
- If the document clearly mentions a hotel → look for "HOTELES > ..."
- If it mentions a restaurant → look for "RESTAURANTES > ..."
- If it mentions a gym → look for "GIMNASIOS & FITNESS > ..."
- Examples of good matches:
  * Hotel/Resort → "HOTELES > Hotel de Playa > Todo Incluido"
  * Restaurant/Food → "RESTAURANTES > Comida Local > Ceviche / Sancocho"
  * Gym/Fitness → "GIMNASIOS & FITNESS > Membresía Mensual Ilimitada"
  * Beauty/Spa → "BIENESTAR Y BELLEZA > Facial > Limpieza Profunda / Anti-Edad"
- IMPORTANT: Even if the match isn't perfect, try your best to assign a category. Only use null if absolutely no category seems relevant.

OTHER RULES:
- Extract merchant/business name clearly - this will be the main event name
- For suggestedStartDate: parse any date format and convert to YYYY-MM-DD (e.g., "20/11/2025" becomes "2025-11-20")
- For totalDays: extract the number only (e.g., "5 días" becomes 5)
- Be concise but informative
- Return valid JSON only, no additional text or markdown

PDF Content:
${pdfText.substring(0, 15000)}` // Limit to avoid token limits

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured booking information from documents. Always return valid JSON only. Match categories exactly from the provided hierarchical list.',
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
    const categoryValue = parsedData.category?.trim() || null
    
    // Log what the AI returned for debugging
    if (categoryValue) {
      console.log('[PDF Parse] AI returned category:', categoryValue)
    } else {
      console.warn('[PDF Parse] AI did not return a category or returned null/empty')
      console.log('[PDF Parse] Full AI response preview:', JSON.stringify(parsedData).substring(0, 500))
    }
    
    const cleanedData: ParsedBookingData = {
      businessName: parsedData.businessName?.trim() || undefined,
      category: categoryValue || undefined,
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
