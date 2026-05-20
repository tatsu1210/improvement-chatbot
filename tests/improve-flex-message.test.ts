import { describe, it, expect } from 'vitest'
import { buildImproveListFlexMessage, buildIdeaProposalFlexMessage } from '@/lib/improve-flex-message'
import type { NotionIssue } from '@/types/notion'

const mockIssue: NotionIssue = {
  id: 'page-id-1',
  number: 3,
  title: 'MTGが長すぎる',
  status: 'Raw',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('buildImproveListFlexMessage', () => {
  it('builds a flex carousel with one bubble per issue', () => {
    const msg = buildImproveListFlexMessage([mockIssue])
    expect(msg.type).toBe('flex')
    expect(msg.contents.type).toBe('carousel')
    expect(msg.contents.contents).toHaveLength(1)
  })

  it('each bubble has a 選択 button with improve postback action', () => {
    const msg = buildImproveListFlexMessage([mockIssue])
    const bubble = msg.contents.contents[0]
    const button = bubble.footer.contents[0]
    expect(button.action.data).toBe('action=improve&issueId=page-id-1')
    expect(button.action.label).toBe('選択')
  })

  it('shows issue number and title in the bubble body', () => {
    const msg = buildImproveListFlexMessage([mockIssue])
    const bubble = msg.contents.contents[0]
    const texts = bubble.body.contents.map((c: { text: string }) => c.text)
    expect(texts).toContain('#3')
    expect(texts.some((t: string) => t.includes('MTGが長すぎる'))).toBe(true)
  })

  it('returns an empty carousel when no issues', () => {
    const msg = buildImproveListFlexMessage([])
    expect(msg.contents.contents).toHaveLength(0)
  })

  it('includes altText with issue count', () => {
    const msg = buildImproveListFlexMessage([mockIssue])
    expect(msg.altText).toContain('1')
  })
})

describe('buildIdeaProposalFlexMessage', () => {
  it('contains the idea text in the message body', () => {
    const msg = buildIdeaProposalFlexMessage(mockIssue, 'MTGを月2回に削減する')
    const body = JSON.stringify(msg)
    expect(body).toContain('MTGを月2回に削減する')
  })

  it('has ✅ OK button with approve_idea postback action', () => {
    const msg = buildIdeaProposalFlexMessage(mockIssue, 'アイディア')
    const body = JSON.stringify(msg)
    expect(body).toContain('action=approve_idea&issueId=page-id-1')
  })

  it('has ❌ キャンセル button with cancel_idea postback action', () => {
    const msg = buildIdeaProposalFlexMessage(mockIssue, 'アイディア')
    const body = JSON.stringify(msg)
    expect(body).toContain('action=cancel_idea&issueId=page-id-1')
  })

  it('shows the issue title in the message', () => {
    const msg = buildIdeaProposalFlexMessage(mockIssue, 'アイディア')
    const body = JSON.stringify(msg)
    expect(body).toContain('MTGが長すぎる')
  })

  it('has type flex', () => {
    const msg = buildIdeaProposalFlexMessage(mockIssue, 'アイディア')
    expect(msg.type).toBe('flex')
  })
})
