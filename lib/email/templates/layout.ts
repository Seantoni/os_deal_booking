export interface EmailLayoutProps {
  title: string
  previewText?: string
  children: string
}

export const EMAIL_STYLES = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
  colors: {
    background: '#f5f5f7', // Apple-like light gray
    card: '#ffffff',
    text: '#1d1d1f', // Apple's almost black
    secondary: '#86868b', // Apple's gray
    accent: '#0066cc', // Apple blue
    border: '#d2d2d7',
    success: '#34c759',
    error: '#ff3b30',
    warning: '#ff9500',
    brand: '#e84c0f',
  },
}

export function renderEmailLayout(props: EmailLayoutProps): string {
  const { title, previewText, children } = props

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="font-family: ${EMAIL_STYLES.fontFamily};">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${EMAIL_STYLES.colors.background}; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { color: ${EMAIL_STYLES.colors.accent}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body style="font-family: ${EMAIL_STYLES.fontFamily}; background-color: ${EMAIL_STYLES.colors.background}; margin: 0; padding: 0; width: 100% !important; color: ${EMAIL_STYLES.colors.text};">
  
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>` : ''}

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: ${EMAIL_STYLES.colors.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${EMAIL_STYLES.colors.card}; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: ${EMAIL_STYLES.colors.brand}; padding: 24px;">
              <img src="https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/OFS_Marca_Blanco_02.png?_t=1754077435" alt="OfertaSimple" width="140" style="display: block; border: 0; max-width: 140px; width: 140px;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${children}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center" style="font-size: 12px; color: ${EMAIL_STYLES.colors.secondary}; line-height: 1.5;">
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.</p>
              <p style="margin: 5px 0 0 0;">Panamá</p>
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

// Helper components

export function renderSectionTitle(title: string): string {
  return `
    <h2 style="margin: 32px 0 16px 0; font-size: 17px; font-weight: 600; color: ${EMAIL_STYLES.colors.text}; letter-spacing: -0.01em;">
      ${title}
    </h2>
  `
}

export function renderKeyValue(label: string, value: string | number | undefined | null, fullWidth: boolean = false): string {
  if (value === undefined || value === null || value === '') return ''
  
  return `
    <div style="margin-bottom: 12px; ${fullWidth ? '' : 'display: inline-block; width: 48%; vertical-align: top;'}">
      <div style="font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${EMAIL_STYLES.colors.secondary}; letter-spacing: 0.05em; margin-bottom: 4px;">
        ${label}
      </div>
      <div style="font-size: 15px; color: ${EMAIL_STYLES.colors.text}; line-height: 1.4;">
        ${value}
      </div>
    </div>
  `
}

export function renderButton(label: string, url: string, variant: 'primary' | 'danger' | 'secondary' = 'primary'): string {
  let bgColor = EMAIL_STYLES.colors.brand // Brand orange for primary
  let textColor = '#ffffff'
  let border = 'none'

  if (variant === 'danger') {
    bgColor = '#ffffff'
    textColor = EMAIL_STYLES.colors.error
    border = `1px solid ${EMAIL_STYLES.colors.border}`
  } else if (variant === 'secondary') {
    bgColor = '#ffffff'
    textColor = EMAIL_STYLES.colors.text
    border = `1px solid ${EMAIL_STYLES.colors.border}`
  }

  return `
    <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: 99px; font-size: 14px; font-weight: 500; border: ${border}; text-align: center; min-width: 120px;">
      ${label}
    </a>
  `
}

export function renderDivider(): string {
  return `
    <div style="height: 1px; background-color: ${EMAIL_STYLES.colors.border}; margin: 32px 0; opacity: 0.5;"></div>
  `
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
