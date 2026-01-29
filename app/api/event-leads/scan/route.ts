import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { runFullEventScan, runEventSiteScan, EventSourceSite, EventScanProgress } from '@/lib/scraping'

export const maxDuration = 300 // 5 minutes max for scanning

/**
 * POST /api/event-leads/scan
 * 
 * Trigger a manual scan of event ticket sites with SSE progress updates.
 * Admin only.
 * 
 * Body (optional):
 * - site: 'ticketplus' | 'panatickets' - scan specific site, or all if not provided
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
    let site: EventSourceSite | null = null
    try {
      const body = await request.json()
      if (body.site && ['ticketplus', 'panatickets'].includes(body.site)) {
        site = body.site as EventSourceSite
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
          
          const progressCallback = (progress: EventScanProgress) => {
            sendEvent('progress', progress)
          }
          
          try {
            console.log(`Starting SSE event scan${site ? ` for ${site}` : ' for all sites'}...`)
            
            // Run scan with progress callback
            const result = site 
              ? await runEventSiteScan(site, progressCallback) 
              : await runFullEventScan(progressCallback)
            
            // Send final result
            sendEvent('complete', {
              success: result.success,
              eventsFound: result.eventsFound,
              newEvents: result.newEvents,
              updatedEvents: result.updatedEvents,
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
    console.log(`Starting regular event scan${site ? ` for ${site}` : ' for all sites'}...`)
    
    const result = site ? await runEventSiteScan(site) : await runFullEventScan()
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Event scan completed successfully' : 'Event scan completed with errors',
      data: {
        eventsFound: result.eventsFound,
        newEvents: result.newEvents,
        updatedEvents: result.updatedEvents,
        duration: result.duration,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    console.error('Event scan API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run event scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
