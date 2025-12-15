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
      <td style="padding: 16px; border-bottom: 1px solid #f1f5f9;">
        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: ${taskTypeColor}22; color: ${taskTypeColor}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${getTaskTypeLabel(task.category)}
          </span>
          ${isOverdue ? `
            <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: #fef2f2; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">
              ⚠️ Vencida
            </span>
          ` : ''}
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">
          ${escapeHtml(task.title)}
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #6b7280; margin-bottom: 8px;">
          <span>🏢 ${escapeHtml(task.opportunity.business.name)}</span>
          <span style="color: #e5e7eb;">|</span>
          <span>📊 ${escapeHtml(stageLabel)}</span>
          <span style="color: #e5e7eb;">|</span>
          <span>🕒 ${formatDateShort(task.date)}</span>
        </div>

        ${task.notes ? `
          <div style="font-size: 13px; color: #4b5563; margin-top: 8px; padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-style: italic;">
            "${escapeHtml(task.notes.substring(0, 150))}${task.notes.length > 150 ? '...' : ''}"
          </div>
        ` : ''}
        
        <div style="margin-top: 12px;">
          <a href="${opportunityUrl}" style="display: inline-block; padding: 6px 0; color: #e84c0f; text-decoration: none; font-size: 13px; font-weight: 600;">
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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de Tareas - OfertaSimple</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-text-size-adjust: none;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header with Branding -->
    <div style="background-color: #ffffff; padding: 20px 30px; border-bottom: 3px solid #e84c0f; text-align: center;">
       <div style="font-size: 24px; font-weight: 800; color: #e84c0f; letter-spacing: -0.5px;">
         OfertaSimple
       </div>
       <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">
         OS Deals Booking
       </div>
    </div>

    <!-- Main Title Area -->
    <div style="background-color: #fff7ed; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0 0 10px 0; color: #c2410c; font-size: 24px; font-weight: 700; line-height: 1.3;">
        📋 Recordatorio de Tareas
      </h1>
      <p style="margin: 0; color: #9a3412; font-size: 16px; line-height: 1.5;">
        ${todayFormatted}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
        ¡Hola <strong>${escapeHtml(userName)}</strong>! 👋
      </p>
      <p style="font-size: 15px; color: #6b7280; margin: 0 0 30px 0;">
        Tienes <strong style="color: #e84c0f;">${totalTasks} tarea${totalTasks !== 1 ? 's' : ''}</strong> pendientes que requieren tu atención.
      </p>

      ${overdueTasks.length > 0 ? `
        <!-- Overdue Tasks Section -->
        <div style="margin-bottom: 30px;">
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 0; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 15px; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              ⚠️ Tareas Vencidas (${overdueTasks.length})
            </h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            ${overdueTasks.map(task => renderTaskRow(task, true, appBaseUrl)).join('')}
          </table>
        </div>
      ` : ''}

      ${dueTodayTasks.length > 0 ? `
        <!-- Due Today Section -->
        <div style="margin-bottom: 30px;">
          <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin-bottom: 0; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 15px; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              📅 Para Hoy (${dueTodayTasks.length})
            </h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            ${dueTodayTasks.map(task => renderTaskRow(task, false, appBaseUrl)).join('')}
          </table>
        </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 40px;">
        <a href="${tasksUrl}" style="display: inline-block; padding: 14px 32px; background-color: #e84c0f; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px rgba(232, 76, 15, 0.2);">
          Ver Todas Mis Tareas →
        </a>
      </div>

    </div>

    <!-- Footer Info -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        &copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}
