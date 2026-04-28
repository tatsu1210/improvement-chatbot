import { describe, it, expect } from 'vitest'
import { formatIssueList } from '@/lib/formatter'
import type { NotionIssue } from '@/types/notion'

describe('formatIssueList', () => {
  it('formats a list of issues into readable text', () => {
    const issues: NotionIssue[] = [
      { id: '1', number: 3, title: '週次MTGが長すぎる', status: 'Raw', createdAt: '2026-04-26T10:00:00.000Z' },
      { id: '2', number: 2, title: 'コードレビューの基準が曖昧', status: '対応中', createdAt: '2026-04-25T09:00:00.000Z' },
    ]
    const result = formatIssueList(issues)
    expect(result).toContain('#3')
    expect(result).toContain('週次MTGが長すぎる')
    expect(result).toContain('Raw')
    expect(result).toContain('#2')
    expect(result).toContain('コードレビューの基準が曖昧')
    expect(result).toContain('対応中')
  })

  it('returns a no-issues message when list is empty', () => {
    const result = formatIssueList([])
    expect(result).toContain('登録された課題はありません')
  })

  it('truncates long titles at 50 characters', () => {
    const longTitle = 'あ'.repeat(60)
    const issues: NotionIssue[] = [
      { id: '1', number: 1, title: longTitle, status: 'Raw', createdAt: '2026-04-26T10:00:00.000Z' },
    ]
    const result = formatIssueList(issues)
    expect(result).toContain('…')
    expect(result.length).toBeLessThan(5000)
  })

  it('includes a header line', () => {
    const issues: NotionIssue[] = [
      { id: '1', number: 1, title: 'テスト課題', status: 'Raw', createdAt: '2026-04-26T10:00:00.000Z' },
    ]
    const result = formatIssueList(issues)
    expect(result).toContain('課題一覧')
  })
})
