/**
 * Task Reminder Email Template
 *
 * Daily reminder email with OfertaSimple branding
 * Includes tasks due today and overdue tasks
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
 */

import { formatSpanishFullDate, formatShortDateNoYear } from '@/lib/date'

// Stage labels for display
const STAGE_LABELS: Record<string, string> = {
  iniciacion: 'Iniciación',
  reunion: 'Reunión',
  propuesta_enviada: 'Propuesta Enviada',
  propuesta_aprobada: 'Propuesta Aprobada',
  won: 'Ganada',
  lost: 'Perdida',
}

export interface TaskForEmail {
  id: string
  title: string
  date: Date
  category: 'meeting' | 'todo'
  notes: string | null
  opportunity: {
    id: string
    stage: string
    business: {
      id: string
      name: string
    }
  }
}

interface TaskReminderEmailProps {
  userName: string
  dueTodayTasks: TaskForEmail[]
  overdueTasks: TaskForEmail[]
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
 * Get task type label in Spanish
 */
function getTaskTypeLabel(category: 'meeting' | 'todo'): string {
  return category === 'meeting' ? 'Reunión' : 'To-do'
}

/**
 * Get task type color
 */
function getTaskTypeColor(category: 'meeting' | 'todo'): string {
  return category === 'meeting' ? '#3b82f6' : '#f97316'
}

/**
 * Render a single task row - Table based
 */
function renderTaskRow(task: TaskForEmail, isOverdue: boolean, appBaseUrl: string): string {
  const taskTypeColor = getTaskTypeColor(task.category)
  const opportunityUrl = `${appBaseUrl}/opportunities?open=${task.opportunity.id}`
  const stageLabel = STAGE_LABELS[task.opportunity.stage] || task.opportunity.stage

  return `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #f1f5f9;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom: 8px;">
              <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: ${taskTypeColor}22; color: ${taskTypeColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                ${getTaskTypeLabel(task.category)}
              </span>
              ${isOverdue ? `
                <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: #fef2f2; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">
                  Vencida
                </span>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 6px;">
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1f2937;">
                ${escapeHtml(task.title)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 8px;">
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.4;">
                <span style="white-space: nowrap;">Negocio: ${escapeHtml(task.opportunity.business.name)}</span>
                <span style="color: #e5e7eb; margin: 0 6px;">|</span>
                <span style="white-space: nowrap;">Etapa: ${escapeHtml(stageLabel)}</span>
                <span style="color: #e5e7eb; margin: 0 6px;">|</span>
                <span style="white-space: nowrap;">Fecha: ${formatShortDateNoYear(task.date)}</span>
              </div>
            </td>
          </tr>
          ${task.notes ? `
          <tr>
            <td style="padding-bottom: 12px;">
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #4b5563; padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-style: italic;">
                "${escapeHtml(task.notes.substring(0, 150))}${task.notes.length > 150 ? '...' : ''}"
              </div>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td>
              <a href="${opportunityUrl}" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: inline-block; padding: 6px 0; color: #e84c0f; text-decoration: none; font-size: 13px; font-weight: 600;">
                Ver Oportunidad
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

/**
 * Generate HTML for task reminder email
 */
export function renderTaskReminderEmail(props: TaskReminderEmailProps): string {
  const { userName, dueTodayTasks, overdueTasks, appBaseUrl } = props
  const todayFormatted = formatSpanishFullDate(new Date())
  const totalTasks = dueTodayTasks.length + overdueTasks.length
  const tasksUrl = `${appBaseUrl}/tasks`

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de Tareas - OfertaSimple</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, h1, h2, h3, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; width: 100% !important;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <!-- Main Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #e84c0f; padding: 20px 30px; border-bottom: 3px solid #c2410c;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" alt="OfertaSimple" width="180" style="display: block; border: 0; max-width: 180px; width: 180px;" />
            </td>
          </tr>

          <!-- Main Title Area -->
          <tr>
            <td align="center" style="background-color: #fff7ed; padding: 28px 30px;">
              <h1 style="margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #c2410c; font-size: 22px; font-weight: 700; line-height: 1.3;">
                Recordatorio de Tareas
              </h1>
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #9a3412; font-size: 15px; line-height: 1.5;">
                ${todayFormatted}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 16px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #374151;">
                Hola <strong>${escapeHtml(userName)}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #6b7280;">
                Tienes <strong style="color: #e84c0f;">${totalTasks} tarea${totalTasks !== 1 ? 's' : ''}</strong> pendientes que requieren tu atención.
              </p>

              <!-- Summary -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="padding-right: 8px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                      <tr>
                        <td style="padding: 12px; text-align: center;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #b91c1c; text-transform: uppercase; font-weight: 600;">Vencidas</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 20px; color: #991b1b; font-weight: 700;">${overdueTasks.length}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left: 8px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
                      <tr>
                        <td style="padding: 12px; text-align: center;">
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9a3412; text-transform: uppercase; font-weight: 600;">Para hoy</div>
                          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 20px; color: #c2410c; font-weight: 700;">${dueTodayTasks.length}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${overdueTasks.length > 0 ? `
                <!-- Overdue Tasks Section -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; width: 100%;">
                  <tr>
                    <td>
                      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 0; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                          Tareas Vencidas (${overdueTasks.length})
                        </h2>
                      </div>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        ${overdueTasks.map(task => renderTaskRow(task, true, appBaseUrl)).join('')}
                      </table>
                    </td>
                  </tr>
                </table>
              ` : ''}

              ${dueTodayTasks.length > 0 ? `
                <!-- Due Today Section -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; width: 100%;">
                  <tr>
                    <td>
                      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin-bottom: 0; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                          Para Hoy (${dueTodayTasks.length})
                        </h2>
                      </div>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        ${dueTodayTasks.map(task => renderTaskRow(task, false, appBaseUrl)).join('')}
                      </table>
                    </td>
                  </tr>
                </table>
              ` : ''}

              <!-- CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${tasksUrl}" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: inline-block; padding: 12px 28px; background-color: #e84c0f; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px rgba(232, 76, 15, 0.2);">
                      Ver Todas Mis Tareas
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Branding -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.
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
