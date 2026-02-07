import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { runFullRestaurantScan, runRestaurantSiteScan, RestaurantSourceSite, RestaurantScanProgress } from '@/lib/scraping'

export const maxDuration = 300 // 5 minutes max for scanning

/**
 * POST /api/restaurant-leads/scan
 * 
 * Trigger a manual scan of restaurant sites with SSE progress updates.
 * Admin only.
 * 
 * Body (optional):
 * - site: 'degusta' - scan specific site, or all if not provided
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
    let site: RestaurantSourceSite | null = null
    try {
      const body = await request.json()
      if (body.site && ['degusta'].includes(body.site)) {
        site = body.site as RestaurantSourceSite
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
          
          const progressCallback = (progress: RestaurantScanProgress) => {
            sendEvent('progress', progress)
          }
          
          try {
            console.log(`Starting SSE restaurant scan${site ? ` for ${site}` : ' for all sites'}...`)
            
            // Run scan with progress callback
            const result = site 
              ? await runRestaurantSiteScan(site, progressCallback) 
              : await runFullRestaurantScan(progressCallback)
            
            // Send final result
            sendEvent('complete', {
              success: result.success,
              restaurantsFound: result.restaurantsFound,
              newRestaurants: result.newRestaurants,
              updatedRestaurants: result.updatedRestaurants,
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
    console.log(`Starting regular restaurant scan${site ? ` for ${site}` : ' for all sites'}...`)
    
    const result = site ? await runRestaurantSiteScan(site) : await runFullRestaurantScan()
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Restaurant scan completed successfully' : 'Restaurant scan completed with errors',
      data: {
        restaurantsFound: result.restaurantsFound,
        newRestaurants: result.newRestaurants,
        updatedRestaurants: result.updatedRestaurants,
        duration: result.duration,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    console.error('Restaurant scan API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run restaurant scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
