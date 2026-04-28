import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// モック
vi.mock('@/lib/verify-signature', () => ({
  verifyLineSignature: vi.fn(),
}))
vi.mock('@/services/notion', () => ({
  createIssue: vi.fn(),
  listIssues: vi.fn(),
}))
vi.mock('@/services/line-reply', () => ({
  replyWithIssueCreated: vi.fn(),
  replyWithIssueList: vi.fn(),
  replyWithError: vi.fn(),
}))

import { verifyLineSignature } from '@/lib/verify-signature'
import { createIssue, listIssues } from '@/services/notion'
import { replyWithIssueCreated, replyWithIssueList, replyWithError } from '@/services/line-reply'
import { POST } from '@/app/api/webhook/route'

const mockVerify = vi.mocked(verifyLineSignature)
const mockCreate = vi.mocked(createIssue)
const mockList = vi.mocked(listIssues)
const mockReplyCreated = vi.mocked(replyWithIssueCreated)
const mockReplyList = vi.mocked(replyWithIssueList)

function makeRequest(body: object, signature = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'x-line-signature': signature, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const messageEvent = (text: string) => ({
  events: [{
    type: 'message',
    replyToken: 'reply-token-xxx',
    webhookEventId: 'event-id-001',
    message: { type: 'text', text },
    source: { userId: 'U123' },
  }],
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/webhook', () => {
  it('returns 401 when signature is invalid', async () => {
    mockVerify.mockResolvedValue(false)
    const req = makeRequest(messageEvent('テスト'), 'bad-sig')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 immediately for valid signature', async () => {
    mockVerify.mockResolvedValue(true)
    mockCreate.mockResolvedValue({ id: '1', number: 1, title: 'テスト', status: 'Raw', createdAt: '2026-04-26T10:00:00Z' })
    const req = makeRequest(messageEvent('テスト'))
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('calls createIssue for regular text message', async () => {
    mockVerify.mockResolvedValue(true)
    mockCreate.mockResolvedValue({ id: '1', number: 5, title: 'MTGが長い', status: 'Raw', createdAt: '2026-04-26T10:00:00Z' })
    const req = makeRequest(messageEvent('MTGが長い'))
    await POST(req)
    // waitUntil のバックグラウンド処理が終わるのを待つ
    await vi.waitFor(() => expect(mockCreate).toHaveBeenCalledWith('MTGが長い'))
  })

  it('calls listIssues when user sends 一覧を見る', async () => {
    mockVerify.mockResolvedValue(true)
    mockList.mockResolvedValue([])
    const req = makeRequest(messageEvent('一覧を見る'))
    await POST(req)
    await vi.waitFor(() => expect(mockList).toHaveBeenCalled())
  })

  it('ignores non-message events silently', async () => {
    mockVerify.mockResolvedValue(true)
    const req = makeRequest({ events: [{ type: 'follow', replyToken: 'x' }] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    await vi.waitFor(() => expect(mockCreate).not.toHaveBeenCalled())
  })
})
