import { describe, it, expect } from 'vitest'
import { buildDeleteListFlexMessage } from '@/lib/flex-message'
import type { NotionIssue } from '@/types/notion'

const makeIssue = (overrides: Partial<NotionIssue> = {}): NotionIssue => ({
  id: 'page-id-abc',
  number: 1,
  title: 'Test Issue',
  status: 'Raw',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('buildDeleteListFlexMessage', () => {
  it('returns flex message type', () => {
    const msg = buildDeleteListFlexMessage([makeIssue()])
    expect(msg.type).toBe('flex')
  })

  it('includes issue number in message content', () => {
    const msg = buildDeleteListFlexMessage([makeIssue({ number: 42 })])
    expect(JSON.stringify(msg)).toContain('#42')
  })

  it('includes delete postback action with issueId', () => {
    const msg = buildDeleteListFlexMessage([makeIssue({ id: 'notion-page-xyz' })])
    const json = JSON.stringify(msg)
    expect(json).toContain('action=delete')
    expect(json).toContain('notion-page-xyz')
  })

  it('truncates titles longer than 40 characters', () => {
    const longTitle = 'A'.repeat(50)
    const msg = buildDeleteListFlexMessage([makeIssue({ title: longTitle })])
    const json = JSON.stringify(msg)
    expect(json).not.toContain(longTitle)
    expect(json).toContain('A'.repeat(40) + '…')
  })

  it('shows all issues in carousel', () => {
    const issues = [
      makeIssue({ number: 1, id: 'id1' }),
      makeIssue({ number: 2, id: 'id2' }),
      makeIssue({ number: 3, id: 'id3' }),
    ]
    const msg = buildDeleteListFlexMessage(issues)
    const carousel = msg.contents as { type: string; contents: unknown[] }
    expect(carousel.type).toBe('carousel')
    expect(carousel.contents).toHaveLength(3)
  })

  it('sets correct altText with issue count', () => {
    const issues = [makeIssue(), makeIssue({ id: 'id2', number: 2 })]
    const msg = buildDeleteListFlexMessage(issues)
    expect(msg.altText).toContain('2')
  })
})
