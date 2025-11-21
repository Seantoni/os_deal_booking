import { NextResponse } from 'next/server'
import { getUserRole } from '@/lib/roles'

export async function GET() {
  try {
    const role = await getUserRole()
    return NextResponse.json({ role })
  } catch (error) {
    return NextResponse.json({ role: 'sales' }, { status: 200 })
  }
}

