import { NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { runFullScan, runSiteScan, runChunkedScan, SourceSite, ScanProgress } from '@/lib/scraping'
import { startCronJobLog, completeCronJobLog, cleanupOldCronJobLogs, markStaleCronJobsAsFailed, updateCronJobProgress } from '@/app/actions/cron-logs'
import { sendCronFailureEmail } from '@/lib/email/services/cron-failure'
import { logger } from '@/lib/logger'

export const maxDuration = 300 // 5 minutes max for scanning
const NEXT_CHUNK_REQUEST_TIMEOUT_MS = 30_000
const NEXT_CHUNK_MAX_RETRIES = 3
const NEXT_CHUNK_RETRY_BASE_DELAY_MS = 1_500
const NEXT_CHUNK_RETRY_MAX_DELAY_MS = 8_000
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

type TriggerNextChunkOutcome =
  | { ok: true; status: number }
  | { ok: false; retryable: boolean; reason: string; status?: number; timedOut?: boolean }

// Get base URL for self-invocation
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return 'http://localhost:3000'
}

/**
 * POST /api/cron/market-intelligence-scan
 * 
 * Trigger a manual scan of competitor sites with SSE progress updates.
 * Admin only.
 * 
 * Body (optional):
 * - site: 'rantanofertas' | 'oferta24' - scan specific site, or all if not provided
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check admin role
    const role = await getUserRole()
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    // Check if client wants SSE
    const acceptHeader = request.headers.get('accept')
    const wantsSSE = acceptHeader?.includes('text/event-stream')
    
    // Parse request body
    let site: SourceSite | null = null
    try {
      const body = await request.json()
      if (body.site && ['rantanofertas', 'oferta24'].includes(body.site)) {
        site = body.site as SourceSite
      }
    } catch {
      // No body or invalid JSON - scan all sites
    }
    
    if (wantsSSE) {
      // Return SSE stream for real-time progress
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          }
          
          const progressCallback = (progress: ScanProgress) => {
            sendEvent('progress', progress)
          }
          
          try {
            console.log(`Starting SSE scan${site ? ` for ${site}` : ' for all sites'}...`)
            
            // Run scan with progress callback
            const result = site 
              ? await runSiteScan(site, progressCallback) 
              : await runFullScan(progressCallback)
            
            // Send final result
            sendEvent('complete', {
              success: result.success,
              totalDealsFound: result.totalDealsFound,
              totalDealsWithSales: result.totalDealsWithSales,
              newDeals: result.newDeals,
              updatedDeals: result.updatedDeals,
              duration: result.duration,
              errors: result.errors.length > 0 ? result.errors : undefined,
            })
          } catch (error) {
            sendEvent('error', {
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          } finally {
            controller.close()
          }
        },
      })
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }
    
    // Regular JSON response (no streaming)
    console.log(`Starting regular scan${site ? ` for ${site}` : ' for all sites'}...`)
    
    const result = site ? await runSiteScan(site) : await runFullScan()
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Scan completed successfully' : 'Scan completed with errors',
      data: {
        totalDealsFound: result.totalDealsFound,
        totalDealsWithSales: result.totalDealsWithSales,
        newDeals: result.newDeals,
        updatedDeals: result.updatedDeals,
        duration: result.duration,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    console.error('Scan API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/market-intelligence-scan
 * 
 * For cron job - trigger daily scan with chunked processing.
 * Supports self-invocation for long-running scans.
 * 
 * Query params:
 * - site: 'rantanofertas' | 'oferta24' - which site to scan
 * - startFrom: number - starting index for chunked scan
 * - internal: 'true' - indicates self-invocation (for logging only)
 * - logId: string - cron log ID to continue using
 * 
 * Auth: Bearer token via Authorization header (CRON_SECRET).
 * Both Vercel Cron and internal chunk calls use the same header.
 * Falls back to admin session auth when CRON_SECRET is not configured.
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  let activeLogId: string | null = null

  try {
    const url = new URL(request.url)
    const site = url.searchParams.get('site') as SourceSite | null
    const startFrom = parseInt(url.searchParams.get('startFrom') || '0', 10)
    const existingLogId = url.searchParams.get('logId')
    activeLogId = existingLogId
    
    // Auth: single path for both Vercel Cron and internal chunk calls.
    // Both use Authorization: Bearer <CRON_SECRET> header.
    const authHeader = request.headers.get('authorization') || ''
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret) {
      const expected = `Bearer ${expectedSecret}`
      const isValid =
        authHeader.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(authHeader, 'utf-8'), Buffer.from(expected, 'utf-8'))
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
      }
    } else {
      // Fail closed: no CRON_SECRET configured, require admin session auth
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const role = await getUserRole()
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    // If no site specified, start the scan sequence
    if (!site) {
      logger.info('Starting market-intelligence-scan cron job')
      
      // Clean up any previous runs stuck in "running" (e.g. Vercel killed the function)
      await markStaleCronJobsAsFailed('market-intelligence-scan', 10)
      
      // Start cron job log at the beginning of the scan sequence
      const logResult = await startCronJobLog('market-intelligence-scan', 'cron')
      const logId = logResult.logId
      activeLogId = logId ?? null
      
      // Start with oferta24 (fast, completes in one go)
      const result = await runChunkedScan('oferta24', 0)
      
      // Log progress for this first chunk
      if (logId) {
        await updateCronJobProgress(logId, {
          site: 'oferta24',
          chunkStartFrom: 0,
          chunkDealsProcessed: result.dealsProcessed,
          chunkNewDeals: result.newDeals,
          chunkUpdatedDeals: result.updatedDeals,
          chunkErrors: result.errors.length > 0 ? result.errors : undefined,
          isComplete: result.isComplete && !result.nextStartFrom,
          nextStartFrom: result.nextStartFrom,
        })
      }
      
      // Fire-and-forget: schedule the next chunk AFTER the response is sent.
      // This breaks the cascading-timeout chain — each invocation only
      // occupies its own time, and the next chunk runs independently.
      if (result.nextStartFrom !== undefined) {
        after(() => triggerNextChunkWithRetry('oferta24', result.nextStartFrom!, expectedSecret, logId))
      } else {
        // Oferta24 complete, start RantanOfertas
        after(() => triggerNextChunkWithRetry('rantanofertas', 0, expectedSecret, logId))
      }
      
      return NextResponse.json({
        success: true,
        message: 'Scan started',
        logId,
        data: {
          site: 'oferta24',
          dealsProcessed: result.dealsProcessed,
          newDeals: result.newDeals,
          updatedDeals: result.updatedDeals,
          duration: result.duration,
          isComplete: result.isComplete,
          nextStartFrom: result.nextStartFrom,
        },
      })
    }
    
    // Process specific site chunk
    logger.info(`Processing chunk: ${site} starting from ${startFrom}`)
    const result = await runChunkedScan(site, startFrom)
    
    // Log per-chunk progress so the admin dashboard shows where the scan is
    if (activeLogId) {
      await updateCronJobProgress(activeLogId, {
        site,
        chunkStartFrom: startFrom,
        chunkDealsProcessed: result.dealsProcessed,
        chunkNewDeals: result.newDeals,
        chunkUpdatedDeals: result.updatedDeals,
        chunkErrors: result.errors.length > 0 ? result.errors : undefined,
        isComplete: site === 'rantanofertas' && result.isComplete,
        nextStartFrom: result.nextStartFrom,
      })
    }
    
    // Fire-and-forget: schedule the next chunk AFTER the response is sent.
    if (result.nextStartFrom !== undefined) {
      // More deals to process for this site
      after(() => triggerNextChunkWithRetry(site, result.nextStartFrom!, expectedSecret, activeLogId))
    } else if (site === 'oferta24') {
      // Oferta24 complete, start RantanOfertas
      after(() => triggerNextChunkWithRetry('rantanofertas', 0, expectedSecret, activeLogId))
    } else if (site === 'rantanofertas' && result.isComplete) {
      // Scan is fully done - complete the log
      const durationMs = Date.now() - startTime
      
      if (activeLogId) {
        await completeCronJobLog(activeLogId, result.success ? 'success' : 'failed', {
          message: `Market intelligence scan completed`,
          details: {
            dealsProcessed: result.dealsProcessed,
            dealsWithSales: result.dealsWithSales,
            newDeals: result.newDeals,
            updatedDeals: result.updatedDeals,
            totalAvailable: result.totalAvailable,
            errors: result.errors.length > 0 ? result.errors : undefined,
          },
          error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        })
        
        // If there were errors, send notification
        if (result.errors.length > 0) {
          await sendCronFailureEmail({
            jobName: 'market-intelligence-scan',
            errorMessage: result.errors.join('; '),
            startedAt: new Date(startTime),
            durationMs,
            details: {
              dealsProcessed: result.dealsProcessed,
              newDeals: result.newDeals,
              updatedDeals: result.updatedDeals,
              errors: result.errors,
            },
          })
        }
        
        // Cleanup old logs
        await cleanupOldCronJobLogs(30)
      }
      
      logger.info(`Market-intelligence-scan cron job completed in ${durationMs}ms`)
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.isComplete ? `${site} scan complete` : `${site} chunk processed`,
      data: {
        site,
        dealsProcessed: result.dealsProcessed,
        dealsWithSales: result.dealsWithSales,
        newDeals: result.newDeals,
        updatedDeals: result.updatedDeals,
        duration: result.duration,
        totalAvailable: result.totalAvailable,
        isComplete: result.isComplete,
        nextStartFrom: result.nextStartFrom,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime
    
    logger.error('Market-intelligence-scan cron job failed:', error)
    
    // Complete the log as failed
    if (activeLogId) {
      await completeCronJobLog(activeLogId, 'failed', {
        error: errorMessage,
      })
    }
    
    // Send failure notification
    await sendCronFailureEmail({
      jobName: 'market-intelligence-scan',
      errorMessage,
      startedAt: new Date(startTime),
      durationMs,
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to run scheduled scan',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * Trigger the next chunk of scanning with retries.
 *
 * Called inside `after()` so it runs AFTER the current response is sent,
 * breaking the cascading-timeout chain that previously caused the scan
 * to get stuck.
 *
 * Keeps the downstream call short so the handoff phase stays well under
 * Vercel function limits, and retries transient 429/5xx/network failures.
 *
 * Auth is sent via Authorization header — never in the URL query string.
 */
async function triggerNextChunkWithRetry(
  site: SourceSite,
  startFrom: number,
  secret?: string,
  logId?: string | null,
): Promise<void> {
  let lastOutcome: TriggerNextChunkOutcome | null = null

  for (let attempt = 1; attempt <= NEXT_CHUNK_MAX_RETRIES; attempt++) {
    const outcome = await triggerNextChunkOnce(site, startFrom, secret, logId)
    lastOutcome = outcome

    if (outcome.ok) {
      return
    }

    if (!outcome.retryable) {
      logger.error(
        `[market-intelligence-scan] Non-retryable chunk handoff failure (${site} #${startFrom}): ${outcome.reason}`,
      )
      break
    }

    if (attempt < NEXT_CHUNK_MAX_RETRIES) {
      const delayMs = Math.min(
        NEXT_CHUNK_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)),
        NEXT_CHUNK_RETRY_MAX_DELAY_MS,
      )
      logger.warn(
        `[market-intelligence-scan] Retry handoff ${attempt}/${NEXT_CHUNK_MAX_RETRIES - 1} for ${site} #${startFrom} in ${delayMs}ms (${outcome.reason})`,
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  if (!lastOutcome) {
    return
  }

  // Timeout means downstream might still be running; avoid force-failing
  // to prevent false negatives in logs.
  if (lastOutcome.timedOut) {
    logger.warn(
      `[market-intelligence-scan] Handoff timed out after retries for ${site} #${startFrom}. Downstream execution may still continue.`,
    )
    return
  }

  if (logId) {
    await completeCronJobLog(logId, 'failed', {
      error: `Failed to trigger next chunk (${site} #${startFrom}): ${lastOutcome.reason}`,
    })
  }

  logger.error(
    `[market-intelligence-scan] Failed to hand off next chunk after ${NEXT_CHUNK_MAX_RETRIES} attempts (${site} #${startFrom}): ${lastOutcome.reason}`,
  )
}

async function triggerNextChunkOnce(
  site: SourceSite,
  startFrom: number,
  secret?: string,
  logId?: string | null,
): Promise<TriggerNextChunkOutcome> {
  const baseUrl = getBaseUrl()
  const nextUrl = new URL('/api/cron/market-intelligence-scan', baseUrl)
  nextUrl.searchParams.set('site', site)
  nextUrl.searchParams.set('startFrom', startFrom.toString())
  nextUrl.searchParams.set('internal', 'true')
  if (logId) {
    nextUrl.searchParams.set('logId', logId)
  }
  
  // Log URL without secrets
  logger.info(`Triggering next chunk: ${site} startFrom=${startFrom} logId=${logId || 'none'}`)
  
  // Build headers — send secret via Authorization header (same as Vercel Cron)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`
  }
  
  // Use AbortController so we don't wait indefinitely for the downstream
  // chunk to finish.  30 s is plenty of time for the HTTP request to be
  // accepted; the downstream chunk will continue on its own.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NEXT_CHUNK_REQUEST_TIMEOUT_MS)
  
  try {
    const res = await fetch(nextUrl.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    if (res.ok) {
      logger.info(`Next chunk triggered: ${site} startFrom=${startFrom} status=${res.status}`)
      return { ok: true, status: res.status }
    }

    const reason = `Downstream returned HTTP ${res.status}`
    const retryable = RETRYABLE_HTTP_STATUSES.has(res.status)

    if (retryable) {
      logger.warn(`Retryable handoff response: ${site} startFrom=${startFrom} status=${res.status}`)
    } else {
      logger.error(`Non-retryable handoff response: ${site} startFrom=${startFrom} status=${res.status}`)
    }

    return {
      ok: false,
      retryable,
      reason,
      status: res.status,
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.warn(
        `triggerNextChunk timed out after ${NEXT_CHUNK_REQUEST_TIMEOUT_MS}ms (downstream may continue): ${site} startFrom=${startFrom}`,
      )
      return {
        ok: false,
        retryable: true,
        timedOut: true,
        reason: `Timed out after ${NEXT_CHUNK_REQUEST_TIMEOUT_MS}ms waiting for downstream response`,
      }
    }

    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Failed to trigger next chunk:', err)
    return {
      ok: false,
      retryable: true,
      reason: `Network error triggering downstream chunk: ${message}`,
    }
  } finally {
    clearTimeout(timeout)
  }
}
