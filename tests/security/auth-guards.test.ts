import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function walkFiles(dir: string, ext: string[], files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, ext, files)
      continue
    }

    if (ext.some(suffix => entry.name.endsWith(suffix))) {
      files.push(fullPath)
    }
  }

  return files
}

test('server actions never use bare await requireAuth/requireAdmin', () => {
  const root = process.cwd()
  const actionsDir = path.join(root, 'app', 'actions')
  const files = walkFiles(actionsDir, ['.ts', '.tsx'])
  const violations: string[] = []

  for (const file of files) {
    const rel = path.relative(root, file)
    const lines = fs.readFileSync(file, 'utf8').split('\n')

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (/^\s*await require(Auth|Admin)\(\)\s*;?\s*$/.test(line)) {
        violations.push(`${rel}:${i + 1}: ${line.trim()}`)
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Found insecure bare auth/admin guard calls:\n${violations.join('\n')}`
  )
})

test('category admin actions enforce requireAdmin', () => {
  const root = process.cwd()
  const file = path.join(root, 'app', 'actions', 'categories.ts')
  const content = fs.readFileSync(file, 'utf8')

  assert.match(
    content,
    /export async function getAllCategoriesAdmin[\s\S]*?const adminResult = await requireAdmin\(\)/,
    'getAllCategoriesAdmin must require admin'
  )

  assert.match(
    content,
    /export async function syncCategoriesToDatabase[\s\S]*?const adminResult = await requireAdmin\(\)/,
    'syncCategoriesToDatabase must require admin'
  )
})

