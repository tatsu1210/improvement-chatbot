import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// .env.local を自動読み込み（Next.js ランタイム外で実行するため）
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] ??= value
  }
}

import { setupRichMenu } from '../src/lib/rich-menu'

setupRichMenu().catch((err: unknown) => {
  console.error('❌ エラー:', err instanceof Error ? err.message : err)
  process.exit(1)
})
