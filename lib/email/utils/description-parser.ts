/**
 * Enhanced description parser
 * Shared utility for parsing structured description fields from booking requests
 */

export interface ParsedDescription {
  campaignDuration?: string
  redemptionMode?: string
  isRecurring?: string
  paymentType?: string
  redemptionContact?: { name?: string; email?: string; phone?: string }
  fiscalData?: { legalName?: string; rucDv?: string; bank?: string; accountNumber?: string }
  businessRules?: { includesTaxes?: string; validOnHolidays?: string; commission?: string }
  businessReview?: string
  pricingOptions?: Array<{ title: string; description?: string; price?: string; realValue?: string; quantity?: string }>
  cancellationPolicy?: string
  additionalComments?: string
  additionalInfo?: { templateDisplayName?: string; fields: Array<{ label: string; value: string }> }
}

/**
 * Parse enhanced form description to extract structured sections
 * Used by both booking request and confirmation email templates
 */
export function parseEnhancedDescription(description: string | undefined): ParsedDescription {
  if (!description) return {}

  const sections: ParsedDescription = {}
  const lines = description.split('\n').map(l => l.trim()).filter(l => l)

  let currentSection = ''
  let currentContent: string[] = []

  for (const line of lines) {
    // Detect section headers
    if (line.includes('Duración de Campaña:')) {
      sections.campaignDuration = line.split(':')[1]?.trim()
    } else if (line.includes('Modalidad de Canje:')) {
      sections.redemptionMode = line.split(':')[1]?.trim()
    } else if (line.includes('Recurrencia:')) {
      sections.isRecurring = line.split(':')[1]?.trim()
    } else if (line.includes('Tipo de Pago:')) {
      sections.paymentType = line.split(':')[1]?.trim()
    } else if (line.includes('Contacto de Canje:')) {
      currentSection = 'redemptionContact'
      sections.redemptionContact = {}
    } else if (line.includes('Datos Fiscales y Bancarios:')) {
      currentSection = 'fiscalData'
      sections.fiscalData = {}
    } else if (line.includes('Reglas de Negocio:')) {
      currentSection = 'businessRules'
      sections.businessRules = {}
    } else if (line.includes('Reseña del Negocio:')) {
      currentSection = 'businessReview'
      currentContent = []
    } else if (line.includes('Opciones de Precio:')) {
      currentSection = 'pricingOptions'
      sections.pricingOptions = []
      currentContent = []
    } else if (line.includes('Políticas de Cancelación:')) {
      currentSection = 'cancellationPolicy'
      currentContent = []
    } else if (line.includes('Comentarios Finales:')) {
      currentSection = 'additionalComments'
      currentContent = []
    } else if (line.startsWith('=== INFORMACIÓN ADICIONAL')) {
      currentSection = 'additionalInfo'
      sections.additionalInfo = { templateDisplayName: '', fields: [] }
      // Extract display name inside parentheses, e.g., "=== INFORMACIÓN ADICIONAL (RESTAURANTE) ==="
      const match = line.match(/\(([^)]+)\)/)
      if (match && match[1]) {
        sections.additionalInfo.templateDisplayName = match[1].trim()
      }
    } else {
      // Process content based on current section
      if (currentSection === 'redemptionContact') {
        if (line.includes('Nombre:')) {
          sections.redemptionContact!.name = line.split(':')[1]?.trim()
        } else if (line.includes('Email:')) {
          sections.redemptionContact!.email = line.split(':')[1]?.trim()
        } else if (line.includes('Teléfono:')) {
          sections.redemptionContact!.phone = line.split(':')[1]?.trim()
        }
      } else if (currentSection === 'fiscalData') {
        if (line.includes('Razón Social:')) {
          sections.fiscalData!.legalName = line.split(':')[1]?.trim()
        } else if (line.includes('RUC y DV:')) {
          sections.fiscalData!.rucDv = line.split(':')[1]?.trim()
        } else if (line.includes('Banco:')) {
          sections.fiscalData!.bank = line.split(':')[1]?.trim()
        } else if (line.includes('Número de Cuenta:')) {
          sections.fiscalData!.accountNumber = line.split(':')[1]?.trim()
        }
      } else if (currentSection === 'businessRules') {
        if (line.includes('Impuestos:')) {
          sections.businessRules!.includesTaxes = line.split(':')[1]?.trim()
        } else if (line.includes('Válido en Feriados:')) {
          sections.businessRules!.validOnHolidays = line.split(':')[1]?.trim()
        } else if (line.includes('Comisión:')) {
          sections.businessRules!.commission = line.split(':')[1]?.trim()
        }
      } else if (currentSection === 'businessReview') {
        currentContent.push(line)
        sections.businessReview = currentContent.join('\n')
      } else if (currentSection === 'pricingOptions') {
        // Parse pricing options (numbered list format)
        if (line.match(/^\d+\./)) {
          const title = line.replace(/^\d+\.\s*/, '').trim()
          sections.pricingOptions!.push({ title, description: '', price: '', realValue: '', quantity: '' })
        } else if (line.startsWith('   ') && sections.pricingOptions!.length > 0) {
          const lastOption = sections.pricingOptions![sections.pricingOptions!.length - 1]
          if (line.includes('Paga $') && line.includes('y consume $')) {
            const priceMatch = line.match(/Paga \$(\d+)/)
            const valueMatch = line.match(/consume \$(\d+)/)
            if (priceMatch) lastOption.price = priceMatch[1]
            if (valueMatch) lastOption.realValue = valueMatch[1]
          } else if (line.includes('Cantidad:')) {
            lastOption.quantity = line.split(':')[1]?.trim() || ''
          } else {
            lastOption.description = (lastOption.description || '') + line.trim() + ' '
          }
        }
      } else if (currentSection === 'cancellationPolicy') {
        currentContent.push(line)
        sections.cancellationPolicy = currentContent.join('\n')
      } else if (currentSection === 'additionalComments') {
        currentContent.push(line)
        sections.additionalComments = currentContent.join('\n')
      } else if (currentSection === 'additionalInfo') {
        if (line.includes(':')) {
          const [label, ...rest] = line.split(':')
          const value = rest.join(':').trim()
          if (label && value) {
            sections.additionalInfo?.fields.push({ label: label.trim(), value })
          }
        }
      }
    }
  }

  return sections
}

