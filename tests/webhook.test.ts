import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/verify-signature', () => ({
  verifyLineSignature: vi.fn(),
}))
vi.mock('@/services/notion', () => ({
  createIssue: vi.fn(),
  listIssues: vi.fn(),
  deleteIssue: vi.fn(),
}))
vi.mock('@/services/line-reply', () => ({
  replyWithIssueCreated: vi.fn(),
  replyWithIssueList: vi.fn(),
  replyWithError: vi.fn(),
  replyWithRegisterPrompt: vi.fn(),
  replyWithDeleteList: vi.fn(),
  replyWithDeleteConfirm: vi.fn(),
}))

import { verifyLineSignature } from '@/lib/verify-signature'
import { createIssue, listIssues, deleteIssue } from '@/services/notion'
import {
  replyWithIssueCreated,
  replyWithIssueList,
  replyWithError,
  replyWithRegisterPrompt,
  replyWithDeleteList,
  replyWithDeleteConfirm,
} from '@/services/line-reply'
import { POST } from '@/app/api/webhook/route'

const mockVerify = vi.mocked(verifyLineSignature)
const mockCreate = vi.mocked(createIssue)
const mockList = vi.mocked(listIssues)
const mockDelete = vi.mocked(deleteIssue)
const mockReplyCreated = vi.mocked(replyWithIssueCreated)
const mockReplyList = vi.mocked(replyWithIssueList)
const mockReplyRegister = vi.mocked(replyWithRegisterPrompt)
const mockReplyDeleteList = vi.mocked(replyWithDeleteList)
const mockReplyDeleteConfirm = vi.mocked(replyWithDeleteConfirm)

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

const postbackEvent = (data: string) => ({
  events: [{
    type: 'postback',
    replyToken: 'reply-token-yyy',
    postback: { data },
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
    await vi.waitFor(() => expect(mockCreate).toHaveBeenCalledWith('MTGが長い'))
  })

  it('calls listIssues when user sends 一覧を見る', async () => {
    mockVerify.mockResolvedValue(true)
    mockList.mockResolvedValue([])
    const req = makeRequest(messageEvent('一覧を見る'))
    await POST(req)
    await vi.waitFor(() => expect(mockList).toHaveBeenCalled())
  })

  it('ignores non-message non-postback events silently', async () => {
    mockVerify.mockResolvedValue(true)
    const req = makeRequest({ events: [{ type: 'follow', replyToken: 'x' }] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    await vi.waitFor(() => expect(mockCreate).not.toHaveBeenCalled())
  })

  it('calls replyWithError when createIssue throws in message handler', async () => {
    mockVerify.mockResolvedValue(true)
    mockCreate.mockRejectedValue(new Error('Notion down'))
    vi.mocked(replyWithError).mockResolvedValue(undefined)
    const req = makeRequest(messageEvent('何かのテキスト'))
    await POST(req)
    await vi.waitFor(() => expect(vi.mocked(replyWithError)).toHaveBeenCalledWith('reply-token-xxx'))
  })
})

describe('POST /api/webhook (postback events)', () => {
  it('calls replyWithRegisterPrompt for action=register', async () => {
    mockVerify.mockResolvedValue(true)
    mockReplyRegister.mockResolvedValue(undefined)
    const req = makeRequest(postbackEvent('action=register'))
    await POST(req)
    await vi.waitFor(() => expect(mockReplyRegister).toHaveBeenCalledWith('reply-token-yyy'))
  })

  it('calls listIssues and replyWithIssueList for action=list', async () => {
    mockVerify.mockResolvedValue(true)
    mockList.mockResolvedValue([])
    mockReplyList.mockResolvedValue(undefined)
    const req = makeRequest(postbackEvent('action=list'))
    await POST(req)
    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalled()
      expect(mockReplyList).toHaveBeenCalledWith('reply-token-yyy', [])
    })
  })

  it('calls listIssues and replyWithDeleteList for action=show_delete_list', async () => {
    mockVerify.mockResolvedValue(true)
    mockList.mockResolvedValue([])
    mockReplyDeleteList.mockResolvedValue(undefined)
    const req = makeRequest(postbackEvent('action=show_delete_list'))
    await POST(req)
    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalled()
      expect(mockReplyDeleteList).toHaveBeenCalledWith('reply-token-yyy', [])
    })
  })

  it('calls deleteIssue and replyWithDeleteConfirm for action=delete', async () => {
    mockVerify.mockResolvedValue(true)
    mockDelete.mockResolvedValue(undefined)
    mockReplyDeleteConfirm.mockResolvedValue(undefined)
    const req = makeRequest(postbackEvent('action=delete&issueId=page-abc-123'))
    await POST(req)
    await vi.waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('page-abc-123')
      expect(mockReplyDeleteConfirm).toHaveBeenCalledWith('reply-token-yyy')
    })
  })

  it('calls replyWithError when deleteIssue throws', async () => {
    mockVerify.mockResolvedValue(true)
    mockDelete.mockRejectedValue(new Error('Notion error'))
    vi.mocked(replyWithError).mockResolvedValue(undefined)
    const req = makeRequest(postbackEvent('action=delete&issueId=page-abc'))
    await POST(req)
    await vi.waitFor(() => expect(vi.mocked(replyWithError)).toHaveBeenCalledWith('reply-token-yyy'))
  })

  it('calls replyWithError when issueId is missing in delete action', async () => {
    mockVerify.mockResolvedValue(true)
    vi.mocked(replyWithError).mockResolvedValue(undefined)
    const req = makeRequest(postbackEvent('action=delete'))
    await POST(req)
    await vi.waitFor(() => expect(vi.mocked(replyWithError)).toHaveBeenCalledWith('reply-token-yyy'))
  })
})
