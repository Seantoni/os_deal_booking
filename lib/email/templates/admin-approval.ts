import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderKeyValue, 
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

interface AdminApprovalEmailProps {
  requestName: string
  businessName: string
  businessEmail: string
  merchant?: string
  category?: string
  startDate: string
  endDate: string
  approvedByName: string
  approvedByEmail: string
  recipientType: 'business' | 'creator'
}

/**
 * Generate HTML string for admin approval notification email
 * Sent to both business and creator when admin approves directly
 */
export function renderAdminApprovalEmail(props: AdminApprovalEmailProps): string {
  const {
    requestName,
    businessName,
    businessEmail,
    merchant,
    category,
    startDate,
    endDate,
    approvedByName,
    approvedByEmail,
    recipientType,
  } = props

  const recipientMessage = recipientType === 'business'
    ? 'Su solicitud ha sido aprobada internamente por el equipo.'
    : 'La solicitud ha sido aprobada internamente.'

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.success}; border-radius: 50%; color: #ffffff; font-size: 24px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">✓</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Solicitud Aprobada
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        ${recipientMessage}
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen de la Solicitud')}
      
      <div style="margin-top: 16px;">
        ${renderKeyValue('Solicitud', escapeHtml(requestName), true)}
        ${merchant ? renderKeyValue('Merchant / Aliado', escapeHtml(merchant), true) : ''}
        
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.05em; margin-bottom: 4px;">Negocio</div>
          <div style="font-size: 15px; color: ${EMAIL_STYLES.colors.text}; font-weight: 500;">${escapeHtml(businessName)}</div>
          <div style="font-size: 13px; color: ${EMAIL_STYLES.colors.secondary};">${escapeHtml(businessEmail)}</div>
        </div>

        ${category ? renderKeyValue('Categoría', escapeHtml(category), true) : ''}
        
        <div style="margin-top: 12px;">
          ${renderKeyValue('Fecha de Inicio', escapeHtml(startDate))}
          ${renderKeyValue('Fecha de Fin', escapeHtml(endDate))}
        </div>
      </div>

      <!-- Admin Approval Info -->
      <div style="margin-top: 24px; padding: 16px; background-color: rgba(52, 199, 89, 0.1); border-radius: 8px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${EMAIL_STYLES.colors.success}; margin-bottom: 4px;">Aprobada por Administrador</div>
        <div style="font-size: 14px; color: ${EMAIL_STYLES.colors.text}; font-weight: 600;">${escapeHtml(approvedByName)}</div>
        <div style="font-size: 13px; color: ${EMAIL_STYLES.colors.secondary};">${escapeHtml(approvedByEmail)}</div>
      </div>
    </div>

    <!-- Note for business -->
    ${recipientType === 'business' ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #fff9e6; border-radius: 8px; color: ${EMAIL_STYLES.colors.warning}; font-size: 13px; line-height: 1.5;">
        <strong>Nota:</strong> Esta solicitud fue aprobada internamente. Si recibió un correo anterior con botones de acción, ya no es necesario utilizarlos.
      </div>
    ` : ''}
  `

  return renderEmailLayout({
    title: 'Solicitud Aprobada - OfertaSimple',
    previewText: `Solicitud aprobada para ${requestName}`,
    children: content
  })
}
