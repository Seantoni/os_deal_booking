import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

function isS3Host(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 's3.amazonaws.com') return true
  if (/^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host)) return true
  if (/^.+\.s3\.amazonaws\.com$/.test(host)) return true
  if (/^.+\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host)) return true
  return false
}

function matchesBucket(url: URL, bucketName: string): boolean {
  const bucket = bucketName.toLowerCase()
  const host = url.hostname.toLowerCase()

  if (host.startsWith(`${bucket}.s3`)) return true

  if (host === 's3.amazonaws.com' || /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host)) {
    const firstPathSegment = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
    return firstPathSegment === bucket
  }

  return false
}

function isAllowedImageUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false
  if (!isS3Host(url.hostname)) return false

  const configuredBucket = ENV.AWS_S3_BUCKET
  if (!configuredBucket) return true
  return matchesBucket(url, configuredBucket)
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const targetUrl = request.nextUrl.searchParams.get('url') || ''
    if (!targetUrl) {
      return NextResponse.json({ success: false, error: 'Missing url parameter' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid url parameter' }, { status: 400 })
    }

    if (!isAllowedImageUrl(parsedUrl)) {
      return NextResponse.json({ success: false, error: 'URL is not allowed for image download' }, { status: 400 })
    }

    const upstream = await fetch(parsedUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
    })

    if (!upstream.ok || !upstream.body) {
      logger.warn('[ImageDownload] Upstream fetch failed', {
        status: upstream.status,
        host: parsedUrl.hostname,
      })
      return NextResponse.json(
        { success: false, error: `Failed to fetch image (${upstream.status})` },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'URL does not point to an image' }, { status: 400 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    logger.error('[ImageDownload] Unexpected error', error)
    return NextResponse.json(
      { success: false, error: 'Unexpected error downloading image' },
      { status: 500 }
    )
  }
}
