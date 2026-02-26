import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function walkRouteFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkRouteFiles(fullPath, files)
      continue
    }

    if (entry.name === 'route.ts') {
      files.push(fullPath)
    }
  }

  return files
}

test('all API routes include an explicit auth/verification guard', () => {
  const root = process.cwd()
  const apiDir = path.join(root, 'app', 'api')
  const routes = walkRouteFiles(apiDir)
  const violations: string[] = []

  const guardPattern = /auth\(|currentUser\(|requireAdmin\(|requireAuth\(|verifyApprovalToken\(|verifyCronSecret\(|svix-signature|CLERK_WEBHOOK_SECRET|authorization/i

  for (const route of routes) {
    const content = fs.readFileSync(route, 'utf8')
    if (!guardPattern.test(content)) {
      violations.push(path.relative(root, route))
    }
  }

  assert.equal(
    violations.length,
    0,
    `API routes missing explicit auth/verification guard:\n${violations.join('\n')}`
  )
})

test('/api/access/check does not expose unnecessary identity fields', () => {
  const root = process.cwd()
  const file = path.join(root, 'app', 'api', 'access', 'check', 'route.ts')
  const content = fs.readFileSync(file, 'utf8')

  assert.ok(!content.includes('allEmails'), 'access check response must not include allEmails')
  assert.ok(!content.includes('allowedEmail:'), 'access check response must not include allowlist details')
  assert.ok(!content.includes('normalizedEmail,'), 'access check response must not include normalizedEmail')
})

test('sentry auth token file is owner-readable only when present', () => {
  const root = process.cwd()
  const file = path.join(root, '.env.sentry-build-plugin')

  if (!fs.existsSync(file)) {
    return
  }

  const mode = fs.statSync(file).mode & 0o777
  assert.equal(
    mode & 0o077,
    0,
    `.env.sentry-build-plugin must not be group/world accessible (mode: ${mode.toString(8)})`
  )
})

