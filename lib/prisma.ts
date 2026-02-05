import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = globalForPrisma.pool ?? new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,  // 10s to establish a connection (covers cold-start DB wake-up)
    idleTimeoutMillis: 20_000,        // close idle clients after 20s (serverless-friendly)
    max: 5,                           // limit pool size for serverless
  })
  const adapter = new PrismaPg(pool)
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool
  }

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
