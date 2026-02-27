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

export interface WeeklyTaskLifecycleSegment {
  key: 'new' | 'recurrent' | 'unknown'
  label: string
  meetingsCompleted: number
  todosCompleted: number
  agreementsYes: number
  agreementsNo: number
  agreementRatePct: number
}

export interface WeeklyTaskReportInsights {
  executiveSummary: string
  trendHighlights: string[]
  bestPractices: string[]
  actionPlan7d: string[]
  actionPlan30d: string[]
  weakPerformerCoaching: string[]
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
  lifecycleSegments: WeeklyTaskLifecycleSegment[]
  topObjections: WeeklyTaskReportObjection[]
  strongPerformers: WeeklyTaskReportPerformer[]
  weakPerformers: WeeklyTaskReportPerformer[]
  insights: WeeklyTaskReportInsights
}

function formatDelta(value: number, suffix = ''): string {
  if (value > 0) return `+${value}${suffix}`
  if (value < 0) return `${value}${suffix}`
  return `0${suffix}`
}

function renderMetricCard(label: string, value: string | number): string {
  return `
    <div style="display: inline-block; width: 48%; margin: 0 1% 12px 1%; vertical-align: top;">
      <div style="border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 10px; padding: 12px; background: #fff;">
        <div style="font-size: 11px; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.04em; margin-bottom: 6px;">
          ${escapeHtml(label)}
        </div>
        <div style="font-size: 22px; font-weight: 700; color: ${EMAIL_STYLES.colors.text};">
          ${escapeHtml(String(value))}
        </div>
      </div>
    </div>
  `
}

function renderSimpleList(items: string[]): string {
  if (items.length === 0) {
    return `<p style="margin: 0; color: ${EMAIL_STYLES.colors.secondary}; font-size: 13px;">Sin hallazgos relevantes.</p>`
  }

  return `
    <ul style="margin: 0; padding-left: 18px; color: ${EMAIL_STYLES.colors.text};">
      ${items
        .map((item) => `<li style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.45;">${escapeHtml(item)}</li>`)
        .join('')}
    </ul>
  `
}

function renderObjections(objections: WeeklyTaskReportObjection[]): string {
  if (objections.length === 0) {
    return `<p style="margin: 0; color: ${EMAIL_STYLES.colors.secondary}; font-size: 13px;">No se detectaron objeciones frecuentes esta semana.</p>`
  }

  return `
    <ul style="margin: 0; padding-left: 18px; color: ${EMAIL_STYLES.colors.text};">
      ${objections
        .map(
          (objection) =>
            `<li style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.45;"><strong>${escapeHtml(objection.text)}</strong> (${objection.count})</li>`,
        )
        .join('')}
    </ul>
  `
}

function renderLifecycleSegments(segments: WeeklyTaskLifecycleSegment[]): string {
  const withActivity = segments.filter(
    (segment) =>
      segment.meetingsCompleted > 0 ||
      segment.todosCompleted > 0 ||
      segment.agreementsYes > 0 ||
      segment.agreementsNo > 0,
  )

  if (withActivity.length === 0) {
    return `<p style="margin: 0; color: ${EMAIL_STYLES.colors.secondary}; font-size: 13px;">Sin actividad suficiente para segmentar por tipo de negocio.</p>`
  }

  return `
    <div>
      ${withActivity
        .map(
          (segment) => `
            <div style="padding: 10px 12px; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 10px; margin-bottom: 8px;">
              <div style="font-size: 13px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; margin-bottom: 4px;">
                ${escapeHtml(segment.label)}
              </div>
              <div style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; line-height: 1.5;">
                Reuniones ${segment.meetingsCompleted} · To-dos ${segment.todosCompleted} · Acuerdo Sí/No ${segment.agreementsYes}/${segment.agreementsNo} · Tasa ${segment.agreementRatePct.toFixed(1)}%
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
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
    lifecycleSegments,
    topObjections,
    strongPerformers,
    weakPerformers,
    insights,
  } = props

  const settingsUrl = `${appBaseUrl}/settings?tab=cron-jobs`

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
    ${renderMetricCard('Reuniones completadas', metrics.meetingsCompleted)}
    ${renderMetricCard('To-dos completados', metrics.todosCompleted)}
    ${renderMetricCard('Acuerdo: Sí', metrics.agreementsYes)}
    ${renderMetricCard('Acuerdo: No', metrics.agreementsNo)}
    ${renderMetricCard('Tareas creadas', metrics.createdTotal)}
    ${renderMetricCard('Tasa de acuerdo', `${metrics.agreementRatePct.toFixed(1)}%`)}

    ${renderSectionTitle('Tendencia vs Semana Previa')}
    <div style="font-size: 14px; color: ${EMAIL_STYLES.colors.text}; line-height: 1.6; margin-bottom: 18px;">
      <div>Reuniones: <strong>${formatDelta(trends.meetingsDelta)}</strong></div>
      <div>To-dos: <strong>${formatDelta(trends.todosDelta)}</strong></div>
      <div>Tasa de acuerdo: <strong>${formatDelta(trends.agreementRateDeltaPct, ' pp')}</strong></div>
    </div>

    ${renderSectionTitle('Segmentación Nuevo vs Recurrente')}
    ${renderLifecycleSegments(lifecycleSegments)}

    ${renderSectionTitle('Objeciones Principales')}
    ${renderObjections(topObjections)}

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
    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: ${EMAIL_STYLES.colors.text};">
      ${escapeHtml(insights.executiveSummary)}
    </p>

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
