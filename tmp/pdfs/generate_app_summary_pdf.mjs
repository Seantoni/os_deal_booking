import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer-core'

const outPath = path.resolve('output/pdf/os_deals_booking_app_summary.pdf')

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: Letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #111827;
      font-size: 10.5px;
      line-height: 1.28;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 17px;
      line-height: 1.15;
      color: #0f172a;
    }
    .subtitle {
      margin: 0 0 10px 0;
      color: #475569;
      font-size: 10px;
    }
    .section {
      margin-bottom: 8px;
      padding: 7px 9px;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #ffffff;
      break-inside: avoid;
    }
    .section h2 {
      margin: 0 0 5px 0;
      font-size: 11px;
      color: #0f172a;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }
    p { margin: 0; }
    ul { margin: 0; padding-left: 14px; }
    li { margin: 0 0 2px 0; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .flow { color: #1f2937; }
  </style>
</head>
<body>
  <h1>OS Deals Booking: App Summary</h1>
  <p class="subtitle">Repo-evidence summary from <span class="mono">/Users/josep/Documents/Dev 2025/os_deals_booking.nosync</span></p>

  <section class="section">
    <h2>What It Is</h2>
    <p>
      OS Deals Booking is an internal CRM and booking management web app for OfertaSimple built with Next.js App Router, Clerk auth, and Prisma/PostgreSQL.
      It centralizes sales pipeline, booking requests, deals, calendar events, and operational workflows in one system.
    </p>
  </section>

  <section class="section">
    <h2>Who It's For</h2>
    <p>
      Primary persona: OfertaSimple internal operations team, especially Sales/Admin users (plus Editor, ERE, Marketing roles defined in <span class="mono">lib/constants/user-roles.ts</span>).
    </p>
  </section>

  <div class="grid">
    <section class="section">
      <h2>What It Does</h2>
      <ul>
        <li>Manages CRM entities: businesses, leads, opportunities, and deals.</li>
        <li>Runs booking request lifecycle with public approval/rejection links.</li>
        <li>Provides calendar/event scheduling tied to booking requests.</li>
        <li>Supports dynamic form configuration and custom fields in Settings.</li>
        <li>Sends transactional emails (booking, reminders, failures) via Resend.</li>
        <li>Includes AI-assisted endpoints for offer/title/content generation.</li>
        <li>Executes scheduled cron jobs for reminders, sync, and intelligence scans.</li>
      </ul>
    </section>

    <section class="section">
      <h2>How To Run (Minimal)</h2>
      <ul>
        <li>Install deps: <span class="mono">npm install</span></li>
        <li>Set required env vars (server-validated): <span class="mono">DATABASE_URL</span>, <span class="mono">TOKEN_SECRET_KEY</span>, <span class="mono">OPENAI_API_KEY</span>, <span class="mono">RESEND_API_KEY</span></li>
        <li>Set Clerk keys: <span class="mono">CLERK_SECRET_KEY</span>, <span class="mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span></li>
        <li>Set app URL: <span class="mono">NEXT_PUBLIC_APP_URL</span> (prod required; dev falls back to localhost)</li>
        <li>Prepare DB: <span class="mono">npm run db:setup</span></li>
        <li>Start dev server: <span class="mono">npm run dev</span></li>
      </ul>
    </section>
  </div>

  <section class="section">
    <h2>How It Works (Architecture Overview)</h2>
    <p class="flow">
      <strong>UI layer:</strong> Next.js route groups separate authenticated pages (<span class="mono">app/(app)</span>) and public flows (<span class="mono">app/(public)</span>); shared UI in <span class="mono">components/</span>.<br/>
      <strong>Access layer:</strong> Clerk middleware in <span class="mono">middleware.ts</span> protects non-public routes, applies API rate limits, and checks allowlist access via <span class="mono">/api/access/check</span>.<br/>
      <strong>Application layer:</strong> server actions (<span class="mono">app/actions/*</span>) and API routes (<span class="mono">app/api/*</span>) implement business logic, status transitions, cron handlers, and integrations.<br/>
      <strong>Data layer:</strong> Prisma client (<span class="mono">lib/prisma.ts</span>) uses PostgreSQL adapter/pool; schema in <span class="mono">prisma/schema.prisma</span> with core models (Business, Opportunity, BookingRequest, Event, Deal, UserProfile).<br/>
      <strong>Integrations:</strong> OpenAI (<span class="mono">lib/openai.ts</span> + AI routes), Resend email templates/services (<span class="mono">lib/email/*</span>), external Oferta API sync (<span class="mono">lib/api/external-oferta/*</span>), and S3 uploads (<span class="mono">lib/s3/*</span>).<br/>
      <strong>Data flow:</strong> User action -> Next.js page/API -> auth/role checks -> server action/API logic -> Prisma queries/mutations -> side effects (email/AI/external sync) -> UI refresh via cache invalidation/revalidation.
    </p>
  </section>

  <section class="section">
    <h2>Not Found In Repo</h2>
    <ul>
      <li>Official production URL/domain and deployment environment values.</li>
      <li>A committed <span class="mono">.env.example</span> template file.</li>
    </ul>
  </section>
</body>
</html>`

const possiblePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
if (!executablePath) {
  for (const p of possiblePaths) {
    try {
      await fs.access(p)
      executablePath = p
      break
    } catch {}
  }
}

if (!executablePath) {
  throw new Error('Chrome/Chromium executable not found')
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

try {
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
  })
  await fs.writeFile(outPath, pdf)
  console.log(outPath)
} finally {
  await browser.close()
}
