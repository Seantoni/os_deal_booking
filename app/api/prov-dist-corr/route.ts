import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/prov-dist-corr
 * Returns all entries from ProvDistCorr table
 */
export async function GET() {
  try {
    const data = await prisma.provDistCorr.findMany({
      select: {
        id: true,
        value: true,
      },
      orderBy: {
        value: 'asc',
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching prov-dist-corr:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prov-dist-corr data' },
      { status: 500 }
    )
  }
}
