/**
 * API Failure Email Template
 *
 * Notification email sent to admin when external API calls fail
 */

import {
  renderEmailLayout,
  renderSectionTitle,
  renderKeyValue,
  renderButton,
  escapeHtml,
  EMAIL_STYLES
} from './layout'

interface ApiFailureEmailProps {
  endpoint: string
  method: string
  errorMessage: string
  statusCode?: number
  requestBody?: Record<string, unknown>
  responseRaw?: string
  createdAt: Date
  durationMs?: number
  userId?: string
  triggeredBy?: string
  appBaseUrl: string
}

/**
 * Get API endpoint display name
 */
function getEndpointDisplayName(endpoint: string): string {
  if (endpoint.includes('/vendors')) return 'Vendor API (OfertaSimple)'
  if (endpoint.includes('/deals')) return 'Deal API (OfertaSimple)'
  return 'External API'
}

/**
 * Format date in Spanish
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('es-PA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Panama',
  })
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

/**
 * Generate HTML for API failure email
 */
export function renderApiFailureEmail(props: ApiFailureEmailProps): string {
  const {
    endpoint,
    method,
    errorMessage,
    statusCode,
    requestBody,
    responseRaw,
    createdAt,
    durationMs,
    userId,
    triggeredBy,
    appBaseUrl
  } = props

  const displayName = getEndpointDisplayName(endpoint)
  const formattedDate = formatDateTime(createdAt)
  const apiLogsUrl = `${appBaseUrl}/settings?tab=api-logs`

  // Limit response display to first 500 chars
  const responsePreview = responseRaw
    ? responseRaw.substring(0, 500) + (responseRaw.length > 500 ? '...' : '')
    : 'No response'

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.error}; border-radius: 50%; color: #ffffff; font-size: 24px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">!</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Error en API Externa
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        ${escapeHtml(displayName)}
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen del Error')}

      <div style="margin-top: 16px; margin-bottom: 24px;">
        ${renderKeyValue('Endpoint', escapeHtml(endpoint), true)}
        ${renderKeyValue('Método', method, true)}
        ${statusCode ? renderKeyValue('Código HTTP', statusCode.toString(), true) : ''}
        ${renderKeyValue('Fecha', escapeHtml(formattedDate), true)}
        ${durationMs ? renderKeyValue('Duración', formatDuration(durationMs), true) : ''}
        ${triggeredBy ? renderKeyValue('Disparado por', triggeredBy, true) : ''}
        ${userId ? renderKeyValue('Usuario', userId, true) : ''}
      </div>

      <!-- Error Message -->
      <div style="padding: 16px; background-color: rgba(255, 59, 48, 0.05); border-radius: 8px; border-left: 3px solid ${EMAIL_STYLES.colors.error}; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.error}; letter-spacing: 0.5px;">
          Mensaje de Error
        </h3>
        <code style="font-family: 'SF Mono', Monaco, monospace; font-size: 12px; color: ${EMAIL_STYLES.colors.text}; display: block; white-space: pre-wrap; word-break: break-word;">
          ${escapeHtml(errorMessage)}
        </code>
      </div>

      ${requestBody && Object.keys(requestBody).length > 0 ? `
        <!-- Request Body Preview -->
        <div style="padding: 16px; background-color: #ffffff; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 8px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.5px;">
            Request Body (Resumen)
          </h3>
          <pre style="margin: 0; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; color: ${EMAIL_STYLES.colors.text}; white-space: pre-wrap; word-break: break-word;">${escapeHtml(JSON.stringify(requestBody, null, 2).substring(0, 300))}${JSON.stringify(requestBody).length > 300 ? '...' : ''}</pre>
        </div>
      ` : ''}

      ${responseRaw ? `
        <!-- Response Preview -->
        <div style="padding: 16px; background-color: #ffffff; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.5px;">
            Response (Primeros 500 caracteres)
          </h3>
          <pre style="margin: 0; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; color: ${EMAIL_STYLES.colors.text}; white-space: pre-wrap; word-break: break-word;">${escapeHtml(responsePreview)}</pre>
        </div>
      ` : ''}
    </div>

    <!-- CTA Button -->
    <div style="margin-top: 32px; text-align: center;">
      ${renderButton('Ver Logs de API', apiLogsUrl, 'secondary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Error en API Externa - OfertaSimple',
    previewText: `Error en ${displayName}: ${errorMessage}`,
    children: content
  })
}

/**
 * Generate plain text version for API failure email
 */
export function renderApiFailureEmailText(props: ApiFailureEmailProps): string {
  const {
    endpoint,
    method,
    errorMessage,
    statusCode,
    requestBody,
    responseRaw,
    createdAt,
    durationMs,
    userId,
    triggeredBy,
    appBaseUrl
  } = props

  const displayName = getEndpointDisplayName(endpoint)
  const formattedDate = formatDateTime(createdAt)
  const apiLogsUrl = `${appBaseUrl}/settings?tab=api-logs`

  const responsePreview = responseRaw
    ? responseRaw.substring(0, 500) + (responseRaw.length > 500 ? '...' : '')
    : 'No response'

  return `
ERROR EN API EXTERNA - OfertaSimple
===================================

API: ${displayName}
Endpoint: ${endpoint}
Método: ${method}
${statusCode ? `Código HTTP: ${statusCode}` : ''}
Fecha: ${formattedDate}
${durationMs ? `Duración: ${formatDuration(durationMs)}` : ''}
${triggeredBy ? `Disparado por: ${triggeredBy}` : ''}
${userId ? `Usuario: ${userId}` : ''}

MENSAJE DE ERROR:
${errorMessage}

${requestBody && Object.keys(requestBody).length > 0 ? `
REQUEST BODY (Resumen):
${JSON.stringify(requestBody, null, 2).substring(0, 300)}${JSON.stringify(requestBody).length > 300 ? '...' : ''}
` : ''}

${responseRaw ? `
RESPONSE (Primeros 500 caracteres):
${responsePreview}
` : ''}

Ver logs completos: ${apiLogsUrl}

---
OfertaSimple - Sistema de Notificaciones Automáticas
  `.trim()
}
