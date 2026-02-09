/**
 * Health Check: Database Connection
 * 
 * GET /api/health/database
 * 
 * Tests the database connection with a lightweight query.
 * Restricted to admin users only.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/roles'

export async function GET() {
  // Require admin role - this endpoint exposes system status
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin access required' },
      { status: 403 }
    )
  }

  try {
    // Use a lightweight query instead of $connect/$disconnect.
    // $disconnect tears down the pool and kills connections for
    // subsequent requests on the same serverless instance.
    const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`
    return NextResponse.json({ connected: true, serverTime: result[0]?.now })
  } catch (error) {
    // Only show detailed errors in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Database connection failed'
    
    return NextResponse.json({ 
      connected: false, 
      error: errorMessage
    })
  }
}
