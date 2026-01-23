/**
 * Cron Job Failure Email Template
 * 
 * Notification email sent to admin when a cron job fails
 */

interface CronFailureEmailProps {
  jobName: string
  errorMessage: string
  startedAt: Date
  durationMs?: number
  details?: Record<string, unknown>
  appBaseUrl: string
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Get friendly job name in Spanish
 */
function getJobDisplayName(jobName: string): string {
  const names: Record<string, string> = {
    'deal-metrics-sync': 'Sincronización de Métricas de Deals',
    'task-reminders': 'Recordatorios de Tareas',
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

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cron Job Failed - OfertaSimple</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  </style>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; width: 100% !important;">
  
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Main Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #dc2626; padding: 20px 30px; border-bottom: 3px solid #991b1b;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" alt="OfertaSimple" width="180" style="display: block; border: 0; max-width: 180px; width: 180px;" />
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td align="center" style="background-color: #fef2f2; padding: 30px;">
              <h1 style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #991b1b; font-size: 24px; font-weight: 700; line-height: 1.3;">
                ⚠️ Cron Job Failed
              </h1>
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #b91c1c; font-size: 16px; line-height: 1.5;">
                ${escapeHtml(displayName)}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Error Message -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #991b1b; font-weight: 600;">
                  Error Message
                </h3>
                <p style="margin: 0; font-family: 'Monaco', 'Courier New', monospace; font-size: 13px; color: #dc2626; line-height: 1.5; word-break: break-word;">
                  ${escapeHtml(errorMessage)}
                </p>
              </div>

              <!-- Details Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280;">Job Name</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1f2937; font-weight: 500;">${escapeHtml(jobName)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280;">Started At</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1f2937; font-weight: 500;">${escapeHtml(formattedDate)}</span>
                  </td>
                </tr>
                ${durationMs ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280;">Duration</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1f2937; font-weight: 500;">${formatDuration(durationMs)}</span>
                  </td>
                </tr>
                ` : ''}
              </table>

              ${details && Object.keys(details).length > 0 ? `
              <!-- Additional Details -->
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #374151; font-weight: 600;">
                  Additional Details
                </h3>
                <pre style="margin: 0; font-family: 'Monaco', 'Courier New', monospace; font-size: 12px; color: #4b5563; white-space: pre-wrap; word-break: break-word;">
${escapeHtml(JSON.stringify(details, null, 2))}
                </pre>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
                <tr>
                  <td align="center">
                    <a href="${cronLogsUrl}" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: inline-block; padding: 14px 32px; background-color: #e84c0f; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px rgba(232, 76, 15, 0.2);">
                      Ver Logs de Cron Jobs →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} OfertaSimple. Sistema de Notificaciones Automáticas.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
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
⚠️ CRON JOB FAILED - OfertaSimple
================================

Job: ${displayName} (${jobName})
Started: ${formattedDate}
${durationMs ? `Duration: ${formatDuration(durationMs)}` : ''}

ERROR MESSAGE:
${errorMessage}

${details && Object.keys(details).length > 0 ? `
ADDITIONAL DETAILS:
${JSON.stringify(details, null, 2)}
` : ''}

View all cron logs: ${cronLogsUrl}

---
OfertaSimple - Sistema de Notificaciones Automáticas
  `.trim()
}
