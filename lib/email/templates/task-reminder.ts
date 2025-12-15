/**
 * Task Reminder Email Template
 * 
 * Daily reminder email with OfertaSimple branding
 * Includes tasks due today and overdue tasks
 */

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
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-PA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date short
 */
function formatDateShort(date: Date): string {
  return new Date(date).toLocaleDateString('es-PA', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get task type label in Spanish
 */
function getTaskTypeLabel(category: 'meeting' | 'todo'): string {
  return category === 'meeting' ? '📅 Reunión' : '✓ To-do'
}

/**
 * Get task type color
 */
function getTaskTypeColor(category: 'meeting' | 'todo'): string {
  return category === 'meeting' ? '#3b82f6' : '#f97316'
}

/**
 * Render a single task row
 */
function renderTaskRow(task: TaskForEmail, isOverdue: boolean, appBaseUrl: string): string {
  const taskTypeColor = getTaskTypeColor(task.category)
  const opportunityUrl = `${appBaseUrl}/opportunities?open=${task.opportunity.id}`
  const stageLabel = STAGE_LABELS[task.opportunity.stage] || task.opportunity.stage
  
  return `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: ${taskTypeColor}22; color: ${taskTypeColor};">
            ${getTaskTypeLabel(task.category)}
          </span>
          ${isOverdue ? `
            <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: #fef2f2; color: #dc2626;">
              ⚠️ Vencida
            </span>
          ` : ''}
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">
          ${escapeHtml(task.title)}
        </div>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">
          <strong>Negocio:</strong> ${escapeHtml(task.opportunity.business.name)}
        </div>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">
          <strong>Etapa:</strong> ${escapeHtml(stageLabel)}
        </div>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">
          <strong>Fecha:</strong> ${formatDateShort(task.date)}
        </div>
        ${task.notes ? `
          <div style="font-size: 12px; color: #9ca3af; margin-top: 8px; padding: 8px; background-color: #f9fafb; border-radius: 6px;">
            ${escapeHtml(task.notes.substring(0, 150))}${task.notes.length > 150 ? '...' : ''}
          </div>
        ` : ''}
        <div style="margin-top: 12px;">
          <a href="${opportunityUrl}" style="display: inline-block; padding: 6px 16px; background-color: #e84c0f; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">
            Ver Oportunidad →
          </a>
        </div>
      </td>
    </tr>
  `
}

/**
 * Generate HTML for task reminder email
 */
export function renderTaskReminderEmail(props: TaskReminderEmailProps): string {
  const { userName, dueTodayTasks, overdueTasks, appBaseUrl } = props
  const todayFormatted = formatDate(new Date())
  const totalTasks = dueTodayTasks.length + overdueTasks.length
  const tasksUrl = `${appBaseUrl}/tasks`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Tareas - OfertaSimple</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #e84c0f 0%, #ff6b35 100%); padding: 40px 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="${appBaseUrl}/icon.png" alt="OfertaSimple" style="width: 48px; height: 48px; border-radius: 12px;" />
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
          📋 Recordatorio de Tareas
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
          ${todayFormatted}
        </p>
      </div>
      
      <!-- Main Content -->
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <!-- Greeting -->
        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
          ¡Hola <strong>${escapeHtml(userName)}</strong>! 👋
        </p>
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px 0;">
          Tienes <strong style="color: #e84c0f;">${totalTasks} tarea${totalTasks !== 1 ? 's' : ''}</strong> que requieren tu atención.
        </p>

        ${overdueTasks.length > 0 ? `
          <!-- Overdue Tasks Section -->
          <div style="margin-bottom: 24px;">
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
              <h2 style="margin: 0; font-size: 16px; color: #dc2626; font-weight: 600;">
                ⚠️ Tareas Vencidas (${overdueTasks.length})
              </h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #991b1b;">
                Estas tareas están pendientes y han pasado su fecha límite
              </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; background: #fef2f2; border-radius: 8px; overflow: hidden;">
              ${overdueTasks.map(task => renderTaskRow(task, true, appBaseUrl)).join('')}
            </table>
          </div>
        ` : ''}

        ${dueTodayTasks.length > 0 ? `
          <!-- Due Today Section -->
          <div style="margin-bottom: 24px;">
            <div style="background-color: #fff7ed; border-left: 4px solid #e84c0f; padding: 12px 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
              <h2 style="margin: 0; font-size: 16px; color: #e84c0f; font-weight: 600;">
                📅 Para Hoy (${dueTodayTasks.length})
              </h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #c2410c;">
                Tareas que debes completar hoy
              </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              ${dueTodayTasks.map(task => renderTaskRow(task, false, appBaseUrl)).join('')}
            </table>
          </div>
        ` : ''}

        <!-- CTA Button -->
        <div style="text-align: center; margin-top: 32px;">
          <a href="${tasksUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #e84c0f 0%, #ff6b35 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(232, 76, 15, 0.3);">
            Ver Todas Mis Tareas →
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0 0 8px 0;">
          Este es un correo automático del sistema de gestión de OfertaSimple.
        </p>
        <p style="margin: 0;">
          © ${new Date().getFullYear()} OfertaSimple · Panamá
        </p>
      </div>
    </body>
    </html>
  `
}

