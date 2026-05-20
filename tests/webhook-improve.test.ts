import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/verify-signature', () => ({
  verifyLineSignature: vi.fn(),
}))
vi.mock('@/services/notion', () => ({
  createIssue: vi.fn(),
  listIssues: vi.fn(),
  deleteIssue: vi.fn(),
  getIssue: vi.fn(),
  updateIssueIdea: vi.fn(),
}))
vi.mock('@/services/ai', () => ({
  generateImprovementIdea: vi.fn(),
}))
vi.mock('@/services/line-reply', () => ({
  replyWithIssueCreated: vi.fn(),
  replyWithIssueList: vi.fn(),
  replyWithError: vi.fn(),
  replyWithRegisterPrompt: vi.fn(),
  replyWithDeleteList: vi.fn(),
  replyWithDeleteConfirm: vi.fn(),
  replyWithImproveList: vi.fn(),
  replyWithIdeaProposal: vi.fn(),
  replyWithIdeaApproved: vi.fn(),
  replyWithIdeaCancelled: vi.fn(),
}))

import { verifyLineSignature } from '@/lib/verify-signature'
import { listIssues, getIssue, updateIssueIdea } from '@/services/notion'
import { generateImprovementIdea } from '@/services/ai'
import {
  replyWithError,
  replyWithImproveList,
  replyWithIdeaProposal,
  replyWithIdeaApproved,
  replyWithIdeaCancelled,
} from '@/services/line-reply'
import { POST } from '@/app/api/webhook/route'

const mockVerify = vi.mocked(verifyLineSignature)
const mockList = vi.mocked(listIssues)
const mockGetIssue = vi.mocked(getIssue)
const mockUpdateIdea = vi.mocked(updateIssueIdea)
const mockGenerate = vi.mocked(generateImprovementIdea)
const mockReplyImproveList = vi.mocked(replyWithImproveList)
const mockReplyIdeaProposal = vi.mocked(replyWithIdeaProposal)
const mockReplyIdeaApproved = vi.mocked(replyWithIdeaApproved)
const mockReplyIdeaCancelled = vi.mocked(replyWithIdeaCancelled)

function makeRequest(body: object, signature = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'x-line-signature': signature, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const postbackEvent = (data: string) => ({
  events: [{
    type: 'postback',
    replyToken: 'reply-token-yyy',
    postback: { data },
    source: { userId: 'U123' },
  }],
})

const sampleIssue = { id: 'page-abc', number: 3, title: 'MTGが長すぎる', status: 'Raw' as const, createdAt: '2026-01-01T00:00:00Z' }

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(true)
})

describe('POST /api/webhook (improve flow)', () => {
  it('calls listIssues and replyWithImproveList for action=show_improve_list', async () => {
    mockList.mockResolvedValue([sampleIssue])
    mockReplyImproveList.mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=show_improve_list'))
    await POST(req)

    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalled()
      expect(mockReplyImproveList).toHaveBeenCalledWith('reply-token-yyy', [sampleIssue])
    })
  })

  it('generates idea, saves to Notion, and replies with proposal for action=improve', async () => {
    mockGetIssue.mockResolvedValue(sampleIssue)
    mockGenerate.mockResolvedValue('MTGを週1回・30分に短縮し議事録を共有する。')
    mockUpdateIdea.mockResolvedValue(undefined)
    mockReplyIdeaProposal.mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=improve&issueId=page-abc'))
    await POST(req)

    await vi.waitFor(() => {
      expect(mockGetIssue).toHaveBeenCalledWith('page-abc')
      expect(mockGenerate).toHaveBeenCalledWith('MTGが長すぎる')
      expect(mockUpdateIdea).toHaveBeenCalledWith('page-abc', 'MTGを週1回・30分に短縮し議事録を共有する。')
      expect(mockReplyIdeaProposal).toHaveBeenCalledWith(
        'reply-token-yyy',
        sampleIssue,
        'MTGを週1回・30分に短縮し議事録を共有する。'
      )
    })
  })

  it('calls replyWithIdeaApproved for action=approve_idea', async () => {
    mockReplyIdeaApproved.mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=approve_idea&issueId=page-abc'))
    await POST(req)

    await vi.waitFor(() => {
      expect(mockReplyIdeaApproved).toHaveBeenCalledWith('reply-token-yyy')
    })
  })

  it('clears idea in Notion and replies cancelled for action=cancel_idea', async () => {
    mockUpdateIdea.mockResolvedValue(undefined)
    mockReplyIdeaCancelled.mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=cancel_idea&issueId=page-abc'))
    await POST(req)

    await vi.waitFor(() => {
      expect(mockUpdateIdea).toHaveBeenCalledWith('page-abc', '')
      expect(mockReplyIdeaCancelled).toHaveBeenCalledWith('reply-token-yyy')
    })
  })

  it('calls replyWithError when issueId is missing in action=improve', async () => {
    vi.mocked(replyWithError).mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=improve'))
    await POST(req)

    await vi.waitFor(() => expect(vi.mocked(replyWithError)).toHaveBeenCalledWith('reply-token-yyy'))
  })

  it('calls replyWithError when generateImprovementIdea throws', async () => {
    mockGetIssue.mockResolvedValue(sampleIssue)
    mockGenerate.mockRejectedValue(new Error('OpenRouter down'))
    vi.mocked(replyWithError).mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=improve&issueId=page-abc'))
    await POST(req)

    await vi.waitFor(() => expect(vi.mocked(replyWithError)).toHaveBeenCalledWith('reply-token-yyy'))
  })

  it('calls replyWithError when issueId is missing in action=cancel_idea', async () => {
    vi.mocked(replyWithError).mockResolvedValue(undefined)

    const req = makeRequest(postbackEvent('action=cancel_idea'))
    await POST(req)

    await vi.waitFor(() => expect(vi.mocked(replyWithError)).toHaveBeenCalledWith('reply-token-yyy'))
  })
})
