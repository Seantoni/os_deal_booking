/**
 * PDF Generation Utility
 * 
 * Uses Puppeteer to generate PDFs from HTML content.
 * Leverages existing browser helper for serverless compatibility.
 */

import { getBrowser, createPage } from '@/lib/scraping/browser'
import { logger } from '@/lib/logger'

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal'
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
}

const DEFAULT_OPTIONS: PDFGenerationOptions = {
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
}

/**
 * Generate PDF from HTML string
 * 
 * @param html - HTML content to convert to PDF
 * @param options - PDF generation options
 * @returns Buffer containing the PDF data
 */
export async function generatePDFFromHTML(
  html: string,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const pdfOptions = { ...DEFAULT_OPTIONS, ...options }
  
  let browser
  let page
  
  try {
    logger.info('[PDF] Starting PDF generation')
    
    // Get browser instance (reuses existing if available)
    browser = await getBrowser()
    
    // Create a new page for PDF generation
    // Note: We don't use createPage() here because we want to allow images/fonts to load
    // (createPage() blocks images for scraping efficiency)
    page = await browser.newPage()
    
    // Set content with HTML and wait for all resources (including images) to load
    await page.setContent(html, {
      waitUntil: 'networkidle0', // Wait for all network requests to complete
    })
    
    // Wait a bit more for any lazy-loaded images or fonts
    await page.waitForTimeout(1000)
    
    // Generate PDF
    logger.info('[PDF] Generating PDF with options:', pdfOptions)
    const pdfBuffer = await page.pdf({
      format: pdfOptions.format,
      margin: pdfOptions.margin,
      printBackground: pdfOptions.printBackground ?? true,
      displayHeaderFooter: pdfOptions.displayHeaderFooter ?? false,
      headerTemplate: pdfOptions.headerTemplate,
      footerTemplate: pdfOptions.footerTemplate,
      preferCSSPageSize: pdfOptions.preferCSSPageSize ?? false,
    })
    
    logger.info(`[PDF] PDF generated successfully (${pdfBuffer.length} bytes)`)
    
    return Buffer.from(pdfBuffer)
  } catch (error) {
    logger.error('[PDF] Error generating PDF:', error)
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    // Clean up page
    if (page) {
      try {
        await page.close()
      } catch (closeError) {
        logger.warn('[PDF] Error closing page:', closeError)
      }
    }
    // Note: We don't close the browser here as it's cached and may be reused
    // The browser will be closed automatically when the process ends or when closeBrowser() is called
  }
}

/**
 * Generate PDF from URL
 * Useful for generating PDFs from existing pages
 * 
 * @param url - URL to load and convert to PDF
 * @param options - PDF generation options
 * @returns Buffer containing the PDF data
 */
export async function generatePDFFromURL(
  url: string,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const pdfOptions = { ...DEFAULT_OPTIONS, ...options }
  
  let browser
  let page
  
  try {
    logger.info(`[PDF] Starting PDF generation from URL: ${url}`)
    
    browser = await getBrowser()
    page = await browser.newPage()
    
    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
    })
    
    // Generate PDF
    logger.info('[PDF] Generating PDF with options:', pdfOptions)
    const pdfBuffer = await page.pdf({
      format: pdfOptions.format,
      margin: pdfOptions.margin,
      printBackground: pdfOptions.printBackground ?? true,
      displayHeaderFooter: pdfOptions.displayHeaderFooter ?? false,
      headerTemplate: pdfOptions.headerTemplate,
      footerTemplate: pdfOptions.footerTemplate,
      preferCSSPageSize: pdfOptions.preferCSSPageSize ?? false,
    })
    
    logger.info(`[PDF] PDF generated successfully (${pdfBuffer.length} bytes)`)
    
    return Buffer.from(pdfBuffer)
  } catch (error) {
    logger.error('[PDF] Error generating PDF from URL:', error)
    throw new Error(
      `Failed to generate PDF from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    if (page) {
      try {
        await page.close()
      } catch (closeError) {
        logger.warn('[PDF] Error closing page:', closeError)
      }
    }
  }
}
