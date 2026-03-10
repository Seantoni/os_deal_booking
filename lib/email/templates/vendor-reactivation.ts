import {
  renderEmailLayout,
  escapeHtml,
  EMAIL_STYLES,
} from './layout'
import { daysSince } from '@/lib/date'

type VendorReactivationTemplateDeal = {
  externalDealId: string
  dealName?: string | null
  quantitySold: number
  netRevenue: number
  margin: number
  viewUrl: string
  replicateUrl: string
  launchedAt?: Date | string | null
}

type VendorReactivationEmailTemplateProps = {
  businessName: string
  deals: VendorReactivationTemplateDeal[]
}

function formatElapsedSpanish(days: number): string {
  if (days < 30) return `${days} ${days === 1 ? 'día' : 'días'}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'año' : 'años'}`
  return `${years} ${years === 1 ? 'año' : 'años'} y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`
}

function renderDealCard(deal: VendorReactivationTemplateDeal): string {
  const dealLabel = deal.dealName
    ? escapeHtml(deal.dealName)
    : escapeHtml(deal.externalDealId)

  const days = daysSince(deal.launchedAt ?? null)
  const elapsedPill = days !== null && days > 0
    ? `<span style="display: inline-block; background-color: #f0f0f3; border-radius: 99px; padding: 3px 10px; font-size: 10px; font-weight: 600; color: ${EMAIL_STYLES.colors.secondary}; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 6px; vertical-align: middle;">hace ${formatElapsedSpanish(days)}</span>`
    : ''

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
      <tr>
        <td style="background-color: #f5f5f7; border-radius: 16px; padding: 28px 24px; border-left: 4px solid ${EMAIL_STYLES.colors.brand};">

          <!-- Time Pill + Deal Name -->
          ${elapsedPill ? `<div style="text-align: center; margin-bottom: 6px;">${elapsedPill}</div>` : ''}
          <div style="text-align: center; margin-bottom: 12px; font-size: 16px; font-weight: 700; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.01em; line-height: 1.4;">
            ${dealLabel}
          </div>

          <!-- Quantity Hero -->
          <div style="text-align: center; padding: 0 0 20px 0;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 2px;">
              Cupones vendidos
            </div>
            <div style="font-size: 36px; font-weight: 800; color: ${EMAIL_STYLES.colors.brand}; letter-spacing: -0.04em; line-height: 1;">
              ${deal.quantitySold.toLocaleString()}
            </div>
          </div>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color: ${EMAIL_STYLES.colors.brand}; border-radius: 99px; padding: 15px 32px;">
                <a href="${deal.replicateUrl}" target="_blank" style="display: block; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.01em;">
                  Relanzar este deal &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- Secondary -->
          <div style="text-align: center; margin-top: 10px;">
            <a href="${deal.viewUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; border: 1px solid ${EMAIL_STYLES.colors.border}; border-radius: 99px; padding: 10px 24px; font-size: 12px; font-weight: 600; color: ${EMAIL_STYLES.colors.secondary}; text-decoration: none;">
              Ver deal
            </a>
          </div>

        </td>
      </tr>
    </table>
  `
}

export function renderVendorReactivationEmail(props: VendorReactivationEmailTemplateProps): string {
  const totalSold = props.deals.reduce((sum, d) => sum + d.quantitySold, 0)
  const dealCards = props.deals.map(renderDealCard).join('')

  const content = `
    <!-- Greeting -->
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: ${EMAIL_STYLES.colors.secondary}; text-align: center;">
      Hola, <strong style="color: ${EMAIL_STYLES.colors.text};">${escapeHtml(props.businessName)}</strong>
    </p>

    <!-- Hero Quantity Block -->
    <div style="text-align: center; padding: 24px 0 28px 0; margin-bottom: 28px; border-top: 1px solid ${EMAIL_STYLES.colors.border}; border-bottom: 1px solid ${EMAIL_STYLES.colors.border};">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: ${EMAIL_STYLES.colors.secondary}; margin-bottom: 8px;">
        Sus deals han vendido
      </div>
      <div style="font-size: 44px; font-weight: 800; color: ${EMAIL_STYLES.colors.brand}; letter-spacing: -0.04em; line-height: 1;">
        ${totalSold.toLocaleString()}
      </div>
      <div style="font-size: 14px; color: ${EMAIL_STYLES.colors.secondary}; margin-top: 8px;">
        cupones &middot; ${props.deals.length} ${props.deals.length === 1 ? 'deal' : 'deals'}
      </div>
    </div>

    <!-- Section Label -->
    <div style="margin-bottom: 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: ${EMAIL_STYLES.colors.secondary};">
      Listos para relanzar
    </div>

    <!-- Deal Cards -->
    ${dealCards}

    <!-- Footer Note -->
    <div style="text-align: center; padding: 8px 0 0 0;">
      <p style="margin: 0; font-size: 12px; line-height: 1.6; color: ${EMAIL_STYLES.colors.secondary};">
        Al relanzar, crearemos una solicitud para que nuestro equipo la procese. Sin compromiso.
      </p>
    </div>
  `

  return renderEmailLayout({
    title: 'Sus deals están listos - OfertaSimple',
    previewText: `${props.businessName}, ${totalSold.toLocaleString()} cupones vendidos — relance sus mejores deals`,
    children: content,
  })
}
