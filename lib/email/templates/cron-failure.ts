/**
 * Cron Job Failure Email Template
 *
 * Notification email sent to admin when a cron job fails
 */

import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderKeyValue, 
  renderButton,
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

interface CronFailureEmailProps {
  jobName: string
  errorMessage: string
  startedAt: Date
  durationMs?: number
  details?: Record<string, unknown>
  appBaseUrl: string
}

/**
 * Get friendly job name in Spanish
 */
function getJobDisplayName(jobName: string): string {
  const names: Record<string, string> = {
    'deal-metrics-sync': 'Sincronización de Métricas de Deals',
    'task-reminders': 'Recordatorios de Tareas',
    'daily-comment-summaries': 'Resumen Diario de Comentarios',
    'market-intelligence-scan': 'Escaneo de Inteligencia de Mercado',
  }
  return names[jobName] || jobName
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
 * Generate HTML for cron failure email
 */
export function renderCronFailureEmail(props: CronFailureEmailProps): string {
  const { jobName, errorMessage, startedAt, durationMs, details, appBaseUrl } = props
  const displayName = getJobDisplayName(jobName)
  const formattedDate = formatDateTime(startedAt)
  const cronLogsUrl = `${appBaseUrl}/settings?tab=cron-jobs`

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background-color: ${EMAIL_STYLES.colors.error}; border-radius: 50%; color: #ffffff; font-size: 24px; line-height: 48px; font-weight: bold; margin-bottom: 16px;">!</div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Falla de Cron Job
      </h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary};">
        ${escapeHtml(displayName)}
      </p>
    </div>

    <!-- Summary Card -->
    <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px;">
      ${renderSectionTitle('Resumen del Error')}
      
      <div style="margin-top: 16px; margin-bottom: 24px;">
        ${renderKeyValue('Job', escapeHtml(jobName), true)}
        ${renderKeyValue('Inicio', escapeHtml(formattedDate), true)}
        ${durationMs ? renderKeyValue('Duración', formatDuration(durationMs), true) : ''}
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

      ${details && Object.keys(details).length > 0 ? `
        <!-- Additional Details -->
        <div style="padding: 16px; background-color: #ffffff; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.5px;">
            Detalles Adicionales
          </h3>
          <pre style="margin: 0; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; color: ${EMAIL_STYLES.colors.text}; white-space: pre-wrap; word-break: break-word;">${escapeHtml(JSON.stringify(details, null, 2))}</pre>
        </div>
      ` : ''}
    </div>

    <!-- CTA Button -->
    <div style="margin-top: 32px; text-align: center;">
      ${renderButton('Ver Logs de Cron Jobs', cronLogsUrl, 'secondary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Falla de Cron Job - OfertaSimple',
    previewText: `Falla en ${displayName}: ${errorMessage}`,
    children: content
  })
}

/**
 * Generate plain text version for cron failure email
 */
export function renderCronFailureEmailText(props: CronFailureEmailProps): string {
  const { jobName, errorMessage, startedAt, durationMs, details, appBaseUrl } = props
  const displayName = getJobDisplayName(jobName)
  const formattedDate = formatDateTime(startedAt)
  const cronLogsUrl = `${appBaseUrl}/settings?tab=cron-jobs`

  return `
FALLA DE CRON JOB - OfertaSimple
===============================

Job: ${displayName} (${jobName})
Inicio: ${formattedDate}
${durationMs ? `Duración: ${formatDuration(durationMs)}` : ''}

MENSAJE DE ERROR:
${errorMessage}

${details && Object.keys(details).length > 0 ? `
DETALLES ADICIONALES:
${JSON.stringify(details, null, 2)}
` : ''}

Ver logs de cron jobs: ${cronLogsUrl}

---
OfertaSimple - Sistema de Notificaciones Automáticas
  `.trim()
}
