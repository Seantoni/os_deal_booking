/**
 * Task Reminder Email Template
 *
 * Daily reminder email with OfertaSimple branding
 * Includes tasks due today and overdue tasks
 * Optimized for cross-client compatibility (Outlook, Gmail, etc.)
 */

import { formatSpanishFullDate, formatShortDateNoYear } from '@/lib/date'
import { 
  renderEmailLayout, 
  renderSectionTitle, 
  renderButton,
  escapeHtml,
  EMAIL_STYLES 
} from './layout'

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
 * Get task type label in Spanish
 */
function getTaskTypeLabel(category: 'meeting' | 'todo'): string {
  return category === 'meeting' ? 'Reunión' : 'To-do'
}

/**
 * Get task type color
 */
function getTaskTypeColor(category: 'meeting' | 'todo'): string {
  return category === 'meeting' ? EMAIL_STYLES.colors.accent : EMAIL_STYLES.colors.warning
}

/**
 * Render a single task row
 */
function renderTaskRow(task: TaskForEmail, isOverdue: boolean, appBaseUrl: string): string {
  const taskTypeColor = getTaskTypeColor(task.category)
  const opportunityUrl = `${appBaseUrl}/opportunities?open=${task.opportunity.id}`
  const stageLabel = STAGE_LABELS[task.opportunity.stage] || task.opportunity.stage

  return `
    <div style="padding: 16px 0; border-bottom: 1px solid ${EMAIL_STYLES.colors.border};">
      <div style="margin-bottom: 6px; display: flex; align-items: center;">
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${taskTypeColor}; letter-spacing: 0.05em; margin-right: 8px;">
          ${getTaskTypeLabel(task.category)}
        </span>
        ${isOverdue ? `
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${EMAIL_STYLES.colors.error}; letter-spacing: 0.05em;">
            Vencida
          </span>
        ` : ''}
      </div>
      
      <div style="font-size: 15px; font-weight: 600; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 4px;">
        ${escapeHtml(task.title)}
      </div>
      
      <div style="font-size: 13px; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 8px;">
        ${escapeHtml(task.opportunity.business.name)} • ${escapeHtml(stageLabel)}
      </div>

      ${task.notes ? `
        <div style="font-size: 13px; color: ${EMAIL_STYLES.colors.secondary}; font-style: italic; margin-bottom: 8px; padding-left: 8px; border-left: 2px solid ${EMAIL_STYLES.colors.border};">
          "${escapeHtml(task.notes.substring(0, 100))}${task.notes.length > 100 ? '...' : ''}"
        </div>
      ` : ''}

      <div>
        <a href="${opportunityUrl}" style="font-size: 13px; font-weight: 500; color: ${EMAIL_STYLES.colors.accent}; text-decoration: none;">Ver Oportunidad &rarr;</a>
      </div>
    </div>
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

  const content = `
    <!-- Header Title -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Tus Tareas para Hoy
      </h1>
      <p style="margin: 0; font-size: 16px; color: ${EMAIL_STYLES.colors.secondary};">
        ${todayFormatted}
      </p>
    </div>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text}; text-align: center;">
      Hola <strong>${escapeHtml(userName)}</strong>, tienes <strong>${totalTasks} tarea${totalTasks !== 1 ? 's' : ''}</strong> pendientes.
    </p>

    ${overdueTasks.length > 0 ? `
      <div style="margin-bottom: 32px;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: ${EMAIL_STYLES.colors.error}; letter-spacing: 0.05em; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid ${EMAIL_STYLES.colors.error};">
          Vencidas (${overdueTasks.length})
        </div>
        <div>
          ${overdueTasks.map(task => renderTaskRow(task, true, appBaseUrl)).join('')}
        </div>
      </div>
    ` : ''}

    ${dueTodayTasks.length > 0 ? `
      <div style="margin-bottom: 32px;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: ${EMAIL_STYLES.colors.text}; letter-spacing: 0.05em; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid ${EMAIL_STYLES.colors.text};">
          Para Hoy (${dueTodayTasks.length})
        </div>
        <div>
          ${dueTodayTasks.map(task => renderTaskRow(task, false, appBaseUrl)).join('')}
        </div>
      </div>
    ` : ''}

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 32px;">
      ${renderButton('Ver Todas Mis Tareas', tasksUrl, 'primary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Recordatorio de Tareas - OfertaSimple',
    previewText: `Tienes ${totalTasks} tareas pendientes para hoy`,
    children: content
  })
}
