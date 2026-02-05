/**
 * PDF Generation Utility
 * 
 * Uses Puppeteer to generate PDFs from HTML content.
 * Leverages existing browser helper for serverless compatibility.
 */

import { getBrowser } from '@/lib/scraping/browser'
import { logger } from '@/lib/logger'
import type { Page } from 'puppeteer-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFGenerationOptions {
  /** Page format */
  format?: 'A4' | 'Letter' | 'Legal'
  /** Page margins (CSS units, e.g. '15mm') */
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  printBackground?: boolean
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  preferCSSPageSize?: boolean
  /**
   * Extra delay (ms) after the page reports networkidle0, giving lazy-loaded
   * images / fonts time to render.  Defaults to 500 ms.
   */
  settleDelayMs?: number
  /**
   * Absolute timeout (ms) for the entire PDF generation.  Defaults to 30 000 ms.
   * If exceeded, the operation is aborted and an error is thrown.
   */
  timeoutMs?: number
}

const DEFAULT_OPTIONS: Required<
  Pick<PDFGenerationOptions, 'format' | 'margin' | 'printBackground' | 'displayHeaderFooter' | 'preferCSSPageSize' | 'settleDelayMs' | 'timeoutMs'>
> = {
  format: 'A4',
  margin: {
    top: '20mm',
    right: '15mm',
    bottom: '20mm',
    left: '15mm',
  },
  printBackground: true,
  displayHeaderFooter: false,
  preferCSSPageSize: false,
  settleDelayMs: 500,
  timeoutMs: 30_000,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run `work` inside a fresh Puppeteer page, ensuring the page is always closed
 * afterwards — even when the work throws.  Applies an absolute timeout so a
 * hung browser never blocks the caller forever.
 */
async function withPage<T>(
  label: string,
  timeoutMs: number,
  work: (page: Page) => Promise<T>,
): Promise<T> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    const result = await Promise.race([
      work(page),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`PDF generation timed out after ${timeoutMs} ms`)), timeoutMs),
      ),
    ])
    return result
  } catch (error) {
    logger.error(`[PDF] ${label} failed:`, error)
    throw new Error(
      `Failed to ${label}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  } finally {
    try {
      await page.close()
    } catch (closeError) {
      logger.warn('[PDF] Error closing page:', closeError)
    }
    // Browser is cached & reused — don't close it here.
  }
}

/**
 * Call `page.pdf()` with the resolved options and return a Node `Buffer`.
 */
async function renderPDF(
  page: Page,
  opts: PDFGenerationOptions & typeof DEFAULT_OPTIONS,
): Promise<Buffer> {
  const pdfUint8 = await page.pdf({
    format: opts.format,
    margin: opts.margin,
    printBackground: opts.printBackground,
    displayHeaderFooter: opts.displayHeaderFooter,
    headerTemplate: opts.headerTemplate,
    footerTemplate: opts.footerTemplate,
    preferCSSPageSize: opts.preferCSSPageSize,
  })
  return Buffer.from(pdfUint8)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a PDF from an HTML string.
 *
 * @param html    - Full HTML document (or fragment) to render.
 * @param options - PDF generation options.
 * @returns Buffer containing the PDF data.
 */
export async function generatePDFFromHTML(
  html: string,
  options: PDFGenerationOptions = {},
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return withPage('generate PDF from HTML', opts.timeoutMs, async (page) => {
    logger.info('[PDF] Generating PDF from HTML')

    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Let lazy-loaded images / web-fonts settle.
    if (opts.settleDelayMs > 0) {
      await new Promise((r) => setTimeout(r, opts.settleDelayMs))
    }

    const buffer = await renderPDF(page, opts)
    logger.info(`[PDF] PDF generated successfully (${buffer.length} bytes)`)
    return buffer
  })
}

/**
 * Generate a PDF by navigating to a URL.
 *
 * @param url     - The page to load and convert.
 * @param options - PDF generation options.
 * @returns Buffer containing the PDF data.
 */
export async function generatePDFFromURL(
  url: string,
  options: PDFGenerationOptions = {},
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return withPage('generate PDF from URL', opts.timeoutMs, async (page) => {
    logger.info(`[PDF] Generating PDF from URL: ${url}`)

    await page.goto(url, { waitUntil: 'networkidle0' })

    const buffer = await renderPDF(page, opts)
    logger.info(`[PDF] PDF generated successfully (${buffer.length} bytes)`)
    return buffer
  })
}
