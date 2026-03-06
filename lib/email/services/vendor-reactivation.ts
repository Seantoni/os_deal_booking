import { resend, EMAIL_CONFIG } from '@/lib/email/config'
import { getAppBaseUrl } from '@/lib/config/env'
import { generateVendorReactivationToken } from '@/lib/tokens'
import type { VendorReactivationEligibleDeal } from '@/lib/vendor-reactivation/service'

type SendVendorReactivationEmailParams = {
  businessId: string
  businessName: string
  recipientEmail: string
  eligibleDeals: VendorReactivationEligibleDeal[]
}

type SendVendorReactivationNotificationParams = {
  recipientEmails: string[]
  businessName: string
  requestName: string
  requestUrl: string
  externalDealId: string
  externalDealName?: string | null
}

function renderActionButton(url: string, label: string, variant: 'primary' | 'secondary') {
  const colors = variant === 'primary'
    ? 'background:#2563eb;color:#fff;'
    : 'background:#f3f4f6;color:#111827;border:1px solid #d1d5db;'

  return `
    <a href="${url}" style="display:inline-block;padding:10px 14px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;${colors}">
      ${label}
    </a>
  `
}

function renderVendorReactivationEmail(params: SendVendorReactivationEmailParams) {
  const baseUrl = getAppBaseUrl()
  const items = params.eligibleDeals
    .map((deal) => {
      const viewUrl = deal.previewUrl || deal.dealUrl || '#'
      const replicateToken = generateVendorReactivationToken(params.businessId, deal.externalDealId)
      const replicateUrl = `${baseUrl}/api/vendor-reactivation/replicate?token=${encodeURIComponent(replicateToken)}`
      const dealLabel = deal.dealName ? `${deal.externalDealId} - ${deal.dealName}` : deal.externalDealId

      return `
        <div style="border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;background:#fff;">
          <div style="margin-bottom:8px;font-size:15px;font-weight:700;color:#111827;">${dealLabel}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">
            Vendidos: ${deal.quantitySold.toLocaleString()} · Ingreso: $${Math.round(deal.netRevenue).toLocaleString()} · Comisión: ${Math.round(deal.margin).toLocaleString()}%
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${renderActionButton(viewUrl, 'Ver deal', 'secondary')}
            ${renderActionButton(replicateUrl, 'Replicar', 'primary')}
          </div>
        </div>
      `
    })
    .join('')

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f5f5f7;color:#1f2937;">
      <div style="background:#fff;border-radius:18px;padding:28px;border:1px solid #e5e7eb;">
        <h1 style="margin:0 0 12px;font-size:24px;color:#111827;">Deals listos para reactivar</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">
          ${params.businessName}, encontramos deals históricos de su negocio que están listos para relanzarse.
          Puede ver la referencia original o pedir la replicación inmediata.
        </p>
        ${items}
        <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
          Si hace clic en Replicar, crearemos una solicitud pendiente para que el equipo comercial la revise.
        </p>
      </div>
    </div>
  `
}

function renderVendorReactivationNotificationEmail(params: SendVendorReactivationNotificationParams) {
  const dealLabel = params.externalDealName
    ? `${params.externalDealId} - ${params.externalDealName}`
    : params.externalDealId

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f5f5f7;color:#1f2937;">
      <div style="background:#fff;border-radius:18px;padding:28px;border:1px solid #e5e7eb;">
        <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Nueva reactivación de vendor</h1>
        <p style="margin:0 0 8px;font-size:15px;color:#4b5563;">
          <strong>Negocio:</strong> ${params.businessName}
        </p>
        <p style="margin:0 0 8px;font-size:15px;color:#4b5563;">
          <strong>Deal histórico:</strong> ${dealLabel}
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#4b5563;">
          <strong>Solicitud:</strong> ${params.requestName}
        </p>
        ${renderActionButton(params.requestUrl, 'Abrir solicitud', 'primary')}
      </div>
    </div>
  `
}

export async function sendVendorReactivationEmail(params: SendVendorReactivationEmailParams) {
  await resend.emails.send({
    from: `OfertaSimple <${EMAIL_CONFIG.from}>`,
    to: params.recipientEmail,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `Deals listos para reactivar - ${params.businessName}`,
    html: renderVendorReactivationEmail(params),
  })
}

export async function sendVendorReactivationRequestNotification(
  params: SendVendorReactivationNotificationParams
) {
  if (params.recipientEmails.length === 0) {
    return
  }

  await resend.emails.send({
    from: `OfertaSimple <${EMAIL_CONFIG.from}>`,
    to: params.recipientEmails,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `Nueva reactivación pendiente - ${params.businessName}`,
    html: renderVendorReactivationNotificationEmail(params),
  })
}
