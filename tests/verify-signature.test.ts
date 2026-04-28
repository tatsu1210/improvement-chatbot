import { describe, it, expect } from 'vitest'
import { verifyLineSignature } from '@/lib/verify-signature'

// HMAC-SHA256 of 'test-body' with key 'test-secret' (base64)
// We'll generate this in the test setup
const CHANNEL_SECRET = 'test-secret'
const BODY = JSON.stringify({ events: [] })

async function computeExpectedSignature(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Buffer.from(signature).toString('base64')
}

describe('verifyLineSignature', () => {
  it('returns true for a valid signature', async () => {
    const validSig = await computeExpectedSignature(CHANNEL_SECRET, BODY)
    const result = await verifyLineSignature(CHANNEL_SECRET, BODY, validSig)
    expect(result).toBe(true)
  })

  it('returns false for an invalid signature', async () => {
    const result = await verifyLineSignature(CHANNEL_SECRET, BODY, 'invalidsignature')
    expect(result).toBe(false)
  })

  it('returns false when signature is empty', async () => {
    const result = await verifyLineSignature(CHANNEL_SECRET, BODY, '')
    expect(result).toBe(false)
  })

  it('returns false when body is tampered', async () => {
    const validSig = await computeExpectedSignature(CHANNEL_SECRET, BODY)
    const tamperedBody = JSON.stringify({ events: [{ type: 'injected' }] })
    const result = await verifyLineSignature(CHANNEL_SECRET, tamperedBody, validSig)
    expect(result).toBe(false)
  })

  it('returns false when secret is wrong', async () => {
    const sigWithWrongSecret = await computeExpectedSignature('wrong-secret', BODY)
    const result = await verifyLineSignature(CHANNEL_SECRET, BODY, sigWithWrongSecret)
    expect(result).toBe(false)
  })
})
