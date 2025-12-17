import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

interface GoogleSearchResult {
  items?: Array<{
    title: string
    link: string
    image: {
      contextLink: string
      height: number
      width: number
      thumbnailLink: string
      thumbnailHeight: number
      thumbnailWidth: number
    }
  }>
}

interface ImageSearchResult {
  url: string
  thumbnailUrl: string
  title: string
  sourceUrl: string
  width: number
  height: number
}

/**
 * Search for images using Google Custom Search API
 * POST /api/images/search
 * Body: { query: string, count?: number }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // Check if Google Search is configured
  if (!ENV.GOOGLE_SEARCH_API_KEY || !ENV.GOOGLE_SEARCH_ENGINE_ID) {
    return NextResponse.json(
      { 
        message: 'Google Search API is not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.',
        configured: false 
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { query, count = 10 } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { message: 'Query is required' },
        { status: 400 }
      )
    }

    // Limit count to prevent abuse
    const limitedCount = Math.min(Math.max(1, count), 10)

    logger.info('[ImageSearch] Searching for images:', { query, count: limitedCount })

    // Google Custom Search API - Image Search
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1')
    searchUrl.searchParams.set('key', ENV.GOOGLE_SEARCH_API_KEY)
    searchUrl.searchParams.set('cx', ENV.GOOGLE_SEARCH_ENGINE_ID)
    searchUrl.searchParams.set('q', query.trim())
    searchUrl.searchParams.set('searchType', 'image')
    searchUrl.searchParams.set('num', limitedCount.toString())
    searchUrl.searchParams.set('safe', 'active') // Safe search
    searchUrl.searchParams.set('imgSize', 'large') // Prefer larger images
    searchUrl.searchParams.set('imgType', 'photo') // Prefer photos

    const response = await fetch(searchUrl.toString())

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('[ImageSearch] Google API error:', { status: response.status, error: errorText })
      
      if (response.status === 429) {
        return NextResponse.json(
          { message: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { message: 'Failed to search for images' },
        { status: 500 }
      )
    }

    const data: GoogleSearchResult = await response.json()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ images: [], message: 'No images found' })
    }

    // Transform results
    const images: ImageSearchResult[] = data.items.map(item => ({
      url: item.link,
      thumbnailUrl: item.image.thumbnailLink,
      title: item.title,
      sourceUrl: item.image.contextLink,
      width: item.image.width,
      height: item.image.height,
    }))

    logger.info('[ImageSearch] Found images:', { count: images.length })

    return NextResponse.json({ images, configured: true })
  } catch (error) {
    logger.error('[ImageSearch] Error:', error)
    return NextResponse.json(
      { message: 'Failed to search for images', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Check if image search is configured
 * GET /api/images/search
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const configured = !!ENV.GOOGLE_SEARCH_API_KEY && !!ENV.GOOGLE_SEARCH_ENGINE_ID

  return NextResponse.json({ configured })
}

