import {
  renderEmailLayout,
  renderSectionTitle,
  renderButton,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'

export interface WeeklyTaskReportObjection {
  text: string
  count: number
}

export interface WeeklyTaskReportObjectionCategory {
  category: string
  count: number
  examples: string[]
}

export interface WeeklyTaskReportPerformer {
  name: string
  meetingsCompleted: number
  todosCompleted: number
  agreementsYes: number
  agreementsNo: number
  wins: number
  proposalsSent: number
  score: number
}

export interface WeeklyTaskReportInsights {
  executiveSummary: string
  executivePoints: string[]
  trendHighlights: string[]
  bestPractices: string[]
  actionPlan7d: string[]
  actionPlan30d: string[]
  weakPerformerCoaching: string[]
  objectionCategories: WeeklyTaskReportObjectionCategory[]
}

export interface WeeklyTaskReportEmailProps {
  userName: string
  periodLabel: string
  generatedAtLabel: string
  appBaseUrl: string
  metrics: {
    completedTotal: number
    createdTotal: number
    meetingsCompleted: number
    todosCompleted: number
    agreementsYes: number
    agreementsNo: number
    agreementRatePct: number
  }
  trends: {
    meetingsDelta: number
    todosDelta: number
    agreementRateDeltaPct: number
  }
  strongPerformers: WeeklyTaskReportPerformer[]
  weakPerformers: WeeklyTaskReportPerformer[]
  insights: WeeklyTaskReportInsights
}

interface MetricItem {
  label: string
  value: string
}

function formatDelta(value: number, suffix = ''): string {
  if (value > 0) return `+${value}${suffix}`
  if (value < 0) return `${value}${suffix}`
  return `0${suffix}`
}

function renderMetricCell(metric: MetricItem | null): string {
  if (!metric) {
    return '<td style="width: 50%; padding: 6px;"></td>'
  }

  return `
    <td style="width: 50%; padding: 6px; vertical-align: top;">
      <div style="border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 10px; padding: 12px; background: #fff;">
        <div style="font-size: 11px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.04em; margin-bottom: 6px;">
          ${escapeHtml(metric.label)}
        </div>
        <div style="font-size: 22px; font-weight: 700; color: ${EMAIL_STYLES.colors.text};">
          ${escapeHtml(metric.value)}
        </div>
      </div>
    </td>
  `
}

function renderMetricGrid(metrics: MetricItem[]): string {
  const rows: string[] = []

  for (let i = 0; i < metrics.length; i += 2) {
    rows.push(`
      <tr>
        ${renderMetricCell(metrics[i])}
        ${renderMetricCell(metrics[i + 1] || null)}
      </tr>
    `)
  }

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: separate; border-spacing: 0;">
      ${rows.join('')}
    </table>
  `
}

function renderSimpleList(items: string[], emptyText = 'Sin hallazgos relevantes.'): string {
  if (items.length === 0) {
    return `<p style="margin: 0; color: ${EMAIL_STYLES.colors.secondary}; font-size: 13px;">${escapeHtml(emptyText)}</p>`
  }

  return `
    <ul style="margin: 0; padding-left: 18px; color: ${EMAIL_STYLES.colors.text}; list-style-type: disc;">
      ${items
        .map((item) => `<li style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.45;">${escapeHtml(item)}</li>`)
        .join('')}
    </ul>
  `
}

function renderObjectionCategories(categories: WeeklyTaskReportObjectionCategory[]): string {
  if (categories.length === 0) {
    return `<p style="margin: 0; color: ${EMAIL_STYLES.colors.secondary}; font-size: 13px;">No se detectaron objeciones frecuentes esta semana.</p>`
  }

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: separate; border-spacing: 0;">
      ${categories
        .map(
          (item) => `
            <tr>
              <td style="padding: 0 0 10px 0;">
                <div style="border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 10px; background: #fff; padding: 12px;">
                  <div style="font-size: 14px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 4px;">
                    ${escapeHtml(item.category)} (${item.count})
                  </div>
                  ${item.examples.length > 0
                    ? `<div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; line-height: 1.45;">Ejemplos: ${escapeHtml(item.examples.join(' | '))}</div>`
                    : ''}
                </div>
              </td>
            </tr>
          `,
        )
        .join('')}
    </table>
  `
}

function renderPerformers(title: string, performers: WeeklyTaskReportPerformer[], emptyText: string): string {
  if (performers.length === 0) {
    return `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">${escapeHtml(title)}</h3>
        <p style="margin: 0; color: ${EMAIL_STYLES.colors.secondary}; font-size: 13px;">${escapeHtml(emptyText)}</p>
      </div>
    `
  }

  return `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">${escapeHtml(title)}</h3>
      <div>
        ${performers
          .map(
            (performer) => `
              <div style="border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;">
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px; color: ${EMAIL_STYLES.colors.text};">${escapeHtml(performer.name)}</div>
                <div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; line-height: 1.45;">
                  Score ${performer.score.toFixed(1)} · Reuniones ${performer.meetingsCompleted} · To-dos ${performer.todosCompleted} · Acuerdo Sí/No ${performer.agreementsYes}/${performer.agreementsNo} · Ganadas ${performer.wins} · Propuestas ${performer.proposalsSent}
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `
}

export function renderWeeklyTaskReportEmail(props: WeeklyTaskReportEmailProps): string {
  const {
    userName,
    periodLabel,
    generatedAtLabel,
    appBaseUrl,
    metrics,
    trends,
    strongPerformers,
    weakPerformers,
    insights,
  } = props

  const settingsUrl = `${appBaseUrl}/settings?tab=cron-jobs`

  const kpiMetrics: MetricItem[] = [
    { label: 'Reuniones completadas', value: String(metrics.meetingsCompleted) },
    { label: 'To-dos completados', value: String(metrics.todosCompleted) },
    { label: 'Acuerdo: Sí', value: String(metrics.agreementsYes) },
    { label: 'Acuerdo: No', value: String(metrics.agreementsNo) },
    { label: 'Tareas creadas', value: String(metrics.createdTotal) },
    { label: 'Tasa de acuerdo', value: `${metrics.agreementRatePct.toFixed(1)}%` },
  ]

  const content = `
    <div style="text-align: center; margin-bottom: 26px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.02em;">
        Reporte Semanal Comercial
      </h1>
      <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.colors.secondary};">${escapeHtml(periodLabel)}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: ${EMAIL_STYLES.colors.secondary};">Generado: ${escapeHtml(generatedAtLabel)}</p>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text}; line-height: 1.5;">
      Hola <strong>${escapeHtml(userName)}</strong>, este resumen consolida actividad comercial de tareas y reuniones para apoyar decisiones de dirección.
    </p>

    ${renderSectionTitle('KPI Clave')}
    ${renderMetricGrid(kpiMetrics)}

    ${renderSectionTitle('Tendencia vs Semana Previa')}
    <div style="font-size: 14px; color: ${EMAIL_STYLES.colors.text}; line-height: 1.6; margin-bottom: 18px;">
      <div>Reuniones: <strong>${formatDelta(trends.meetingsDelta)}</strong></div>
      <div>To-dos: <strong>${formatDelta(trends.todosDelta)}</strong></div>
      <div>Tasa de acuerdo: <strong>${formatDelta(trends.agreementRateDeltaPct, ' pp')}</strong></div>
    </div>

    ${renderSectionTitle('Objeciones (Consolidación IA)')}
    ${renderObjectionCategories(insights.objectionCategories)}

    ${renderSectionTitle('Desempeño del Equipo')}
    ${renderPerformers(
      'Usuarios con mejor desempeño',
      strongPerformers,
      'No hay suficiente actividad para identificar top performers con confianza.',
    )}
    ${renderPerformers(
      'Usuarios con desempeño débil',
      weakPerformers,
      'No hay suficiente actividad para marcar weak performers con confianza.',
    )}

    ${renderSectionTitle('Lectura de Dirección Comercial (IA)')}
    <div style="margin-bottom: 14px; border-left: 4px solid ${EMAIL_STYLES.colors.brand}; background: #fff7f2; padding: 10px 12px; border-radius: 6px;">
      <div style="font-size: 13px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 6px;">Resumen ejecutivo</div>
      <div style="font-size: 14px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text};">${escapeHtml(insights.executiveSummary)}</div>
    </div>

    <h3 style="margin: 18px 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">Puntos clave de dirección</h3>
    ${renderSimpleList(insights.executivePoints)}

    <h3 style="margin: 18px 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">Hallazgos de tendencia</h3>
    ${renderSimpleList(insights.trendHighlights)}

    <h3 style="margin: 18px 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">Best practices detectadas</h3>
    ${renderSimpleList(insights.bestPractices)}

    <h3 style="margin: 18px 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">Plan de acción (próximos 7 días)</h3>
    ${renderSimpleList(insights.actionPlan7d)}

    <h3 style="margin: 18px 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">Plan estructural (30 días)</h3>
    ${renderSimpleList(insights.actionPlan30d)}

    <h3 style="margin: 18px 0 8px 0; font-size: 15px; color: ${EMAIL_STYLES.colors.text};">Coaching para weak performers</h3>
    ${renderSimpleList(insights.weakPerformerCoaching)}

    <div style="text-align: center; margin-top: 28px;">
      ${renderButton('Ver Cron Logs', settingsUrl, 'secondary')}
    </div>
  `

  return renderEmailLayout({
    title: 'Reporte Semanal Comercial - OfertaSimple',
    previewText: `Reuniones ${metrics.meetingsCompleted}, To-dos ${metrics.todosCompleted}, acuerdos ${metrics.agreementsYes}/${metrics.agreementsNo}`,
    children: content,
  })
}
