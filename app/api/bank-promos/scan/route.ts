import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { scrapeBGeneral } from '@/lib/scraping'
import type { BGeneralScanProgress } from '@/lib/scraping/types'
import { saveBankPromosFromScan } from '@/app/actions/bank-promos'

export const maxDuration = 120

/**
 * POST /api/bank-promos/scan
 *
 * Trigger a scan of Banco General promociones. Saves to BankPromo table. Admin only.
 *
 * Body (optional):
 * - skipConditions: true — fast mode for cron: list + URL mapping only (~2 requests, ~5–15s).
 *   Conditions stay null; run a full scan from the UI occasionally to backfill.
 * - skipConditions: false or omit — full scan with conditions in parallel batches (~15–35s for 40 promos).
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole()
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let skipConditions = false
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      try {
        const body = await request.json().catch(() => null)
        if (body && typeof body === 'object' && body.skipConditions === true) {
          skipConditions = true
        }
      } catch {
        // invalid JSON
      }
    }

    const acceptHeader = request.headers.get('accept')
    const wantsSSE = acceptHeader?.includes('text/event-stream')

    if (wantsSSE) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          }

          const progressCallback = (progress: BGeneralScanProgress) => {
            sendEvent('progress', progress)
          }

          try {
            const result = await scrapeBGeneral(100, progressCallback, { skipConditions })

            if (result.promos.length > 0) {
              const saveResult = await saveBankPromosFromScan(result.promos)
              sendEvent('complete', {
                success: result.success,
                promosFound: result.promos.length,
                saved: saveResult.saved,
                created: saveResult.created,
                updated: saveResult.updated,
                errors: result.errors.length > 0 ? result.errors : undefined,
              })
            } else {
              sendEvent('complete', {
                success: result.success,
                promosFound: 0,
                saved: 0,
                created: 0,
                updated: 0,
                errors: result.errors.length > 0 ? result.errors : undefined,
              })
            }
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
          Connection: 'keep-alive',
        },
      })
    }

    const result = await scrapeBGeneral(100, undefined, { skipConditions })
    if (result.promos.length > 0) {
      await saveBankPromosFromScan(result.promos)
    }

    return NextResponse.json({
      success: result.success,
      promosFound: result.promos.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('Bank promos scan API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run bank promos scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
