import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { runFullScan, runSiteScan, runChunkedScan, SourceSite, ScanProgress, CHUNK_SIZE } from '@/lib/scraping'

export const maxDuration = 300 // 5 minutes max for scanning

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
 * POST /api/market-intelligence/scan
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
 * GET /api/market-intelligence/scan
 * 
 * For cron job - trigger daily scan with chunked processing.
 * Supports self-invocation for long-running scans.
 * 
 * Query params:
 * - site: 'rantanofertas' | 'oferta24' - which site to scan
 * - startFrom: number - starting index for chunked scan
 * - internal: 'true' - indicates self-invocation (skip auth)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const site = url.searchParams.get('site') as SourceSite | null
    const startFrom = parseInt(url.searchParams.get('startFrom') || '0', 10)
    const isInternalCall = url.searchParams.get('internal') === 'true'
    const internalSecret = url.searchParams.get('secret')
    
    // Check for cron secret or internal call
    // Vercel sends the secret in Authorization: Bearer <secret> format
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    
    // Validate access
    if (isInternalCall) {
      // Internal calls must have matching secret
      if (expectedSecret && internalSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Invalid internal secret' }, { status: 401 })
      }
    } else if (expectedSecret) {
      // External calls (from Vercel Cron) must provide Bearer token
      if (authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
      }
    } else {
      // No CRON_SECRET set, require auth
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
      console.log('Starting chunked scan sequence...')
      
      // Start with oferta24 (fast, completes in one go)
      const result = await runChunkedScan('oferta24', 0)
      
      // Oferta24 typically completes in one go, then start RantanOfertas
      if (result.nextStartFrom !== undefined) {
        triggerNextChunk('oferta24', result.nextStartFrom, expectedSecret)
      } else {
        // Oferta24 complete, start RantanOfertas
        triggerNextChunk('rantanofertas', 0, expectedSecret)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Scan started',
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
    console.log(`Processing chunk: ${site} starting from ${startFrom}`)
    const result = await runChunkedScan(site, startFrom)
    
    // Trigger next chunk or next site
    if (result.nextStartFrom !== undefined) {
      // More deals to process for this site
      triggerNextChunk(site, result.nextStartFrom, expectedSecret)
    } else if (site === 'oferta24') {
      // Oferta24 complete, start RantanOfertas
      triggerNextChunk('rantanofertas', 0, expectedSecret)
    }
    // If rantanofertas completes, scan is fully done
    
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
    console.error('Scheduled scan error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run scheduled scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Trigger the next chunk of scanning (fire-and-forget)
 */
function triggerNextChunk(site: SourceSite, startFrom: number, secret?: string) {
  const baseUrl = getBaseUrl()
  const nextUrl = new URL('/api/market-intelligence/scan', baseUrl)
  nextUrl.searchParams.set('site', site)
  nextUrl.searchParams.set('startFrom', startFrom.toString())
  nextUrl.searchParams.set('internal', 'true')
  if (secret) {
    nextUrl.searchParams.set('secret', secret)
  }
  
  console.log(`Triggering next chunk: ${nextUrl.toString()}`)
  
  // Fire and forget - don't await
  fetch(nextUrl.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }).catch(err => {
    console.error('Failed to trigger next chunk:', err)
  })
}
