import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$connect()
    await prisma.$disconnect()
    return NextResponse.json({ connected: true })
  } catch (error) {
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}

