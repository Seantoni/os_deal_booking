/**
 * Health Check: Database Connection
 * 
 * GET /api/health/database
 * 
 * Tests the database connection
 * Restricted to admin users only
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
    await prisma.$connect()
    await prisma.$disconnect()
    return NextResponse.json({ connected: true })
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

