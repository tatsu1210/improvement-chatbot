import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = vi.hoisted(() => ({
  pages: {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn(),
  },
  dataSources: {
    query: vi.fn(),
  },
}))

vi.mock('@notionhq/client', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Client: vi.fn(function () { return mockClient as any }),
}))

import { createIssue, deleteIssue, listIssues, getIssue, updateIssueIdea } from '@/services/notion'

const makeRawResult = (title: string, status: string, number: number, idea?: string) => ({
  id: 'page-id-123',
  created_time: '2026-01-01T00:00:00Z',
  properties: {
    課題タイトル: { title: [{ plain_text: title }] },
    ステータス: { select: { name: status } },
    通番: { unique_id: { number } },
    ...(idea !== undefined ? { 改善アイディア: { rich_text: [{ plain_text: idea }] } } : {}),
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NOTION_TOKEN = 'test-token'
  process.env.NOTION_DATABASE_ID = 'test-db-id'
  process.env.NOTION_DATA_SOURCE_ID = 'test-source-id'
})

describe('deleteIssue', () => {
  it('calls pages.update with 削除済み status', async () => {
    mockClient.pages.update.mockResolvedValue({})

    await deleteIssue('page-id-123')

    expect(mockClient.pages.update).toHaveBeenCalledWith({
      page_id: 'page-id-123',
      properties: {
        ステータス: { select: { name: '削除済み' } },
      },
    })
  })

  it('propagates errors from Notion API', async () => {
    mockClient.pages.update.mockRejectedValue(new Error('Notion API error'))

    await expect(deleteIssue('page-id-123')).rejects.toThrow('Notion API error')
  })
})

describe('listIssues', () => {
  it('filters out issues with status 削除済み', async () => {
    mockClient.dataSources.query.mockResolvedValue({
      results: [
        makeRawResult('Active Issue', 'Raw', 1),
        makeRawResult('Deleted Issue', '削除済み', 2),
      ],
    })

    const issues = await listIssues()

    expect(issues).toHaveLength(1)
    expect(issues[0].title).toBe('Active Issue')
    expect(issues[0].status).toBe('Raw')
  })

  it('returns empty array when all issues are deleted', async () => {
    mockClient.dataSources.query.mockResolvedValue({
      results: [makeRawResult('Gone', '削除済み', 1)],
    })

    const issues = await listIssues()

    expect(issues).toHaveLength(0)
  })

  it('fetches double the limit to account for deleted items', async () => {
    mockClient.dataSources.query.mockResolvedValue({ results: [] })

    await listIssues(10)

    expect(mockClient.dataSources.query).toHaveBeenCalledWith(
      expect.objectContaining({ page_size: 20 })
    )
  })

  it('returns at most the requested limit of non-deleted issues', async () => {
    mockClient.dataSources.query.mockResolvedValue({
      results: Array.from({ length: 20 }, (_, i) =>
        makeRawResult(`Issue ${i}`, 'Raw', i + 1)
      ),
    })

    const issues = await listIssues(5)

    expect(issues).toHaveLength(5)
  })
})

describe('createIssue', () => {
  it('creates a page and returns a NotionIssue', async () => {
    mockClient.pages.create.mockResolvedValue({
      id: 'new-page-id',
      created_time: '2026-01-01T00:00:00Z',
      properties: {
        課題タイトル: { title: [{ plain_text: 'New Issue' }] },
        ステータス: { select: { name: 'Raw' } },
        通番: { unique_id: { number: 5 } },
      },
    })

    const issue = await createIssue('New Issue')

    expect(issue.id).toBe('new-page-id')
    expect(issue.title).toBe('New Issue')
    expect(issue.status).toBe('Raw')
    expect(issue.number).toBe(5)
    expect(mockClient.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { database_id: 'test-db-id' },
      })
    )
  })

  it('throws when NOTION_DATABASE_ID is not set', async () => {
    delete process.env.NOTION_DATABASE_ID

    await expect(createIssue('test')).rejects.toThrow('NOTION_DATABASE_ID is not set')

    process.env.NOTION_DATABASE_ID = 'test-db-id'
  })
})

describe('getIssue', () => {
  it('retrieves a single issue by page id', async () => {
    mockClient.pages.retrieve.mockResolvedValue(makeRawResult('MTGが長い', 'Raw', 3))

    const issue = await getIssue('page-id-123')

    expect(issue.id).toBe('page-id-123')
    expect(issue.title).toBe('MTGが長い')
    expect(issue.number).toBe(3)
    expect(mockClient.pages.retrieve).toHaveBeenCalledWith({ page_id: 'page-id-123' })
  })

  it('includes idea when 改善アイディア property exists', async () => {
    mockClient.pages.retrieve.mockResolvedValue(makeRawResult('課題', 'Raw', 1, 'アイディアテキスト'))

    const issue = await getIssue('page-id-123')

    expect(issue.idea).toBe('アイディアテキスト')
  })

  it('returns empty idea when 改善アイディア is absent', async () => {
    mockClient.pages.retrieve.mockResolvedValue(makeRawResult('課題', 'Raw', 1))

    const issue = await getIssue('page-id-123')

    expect(issue.idea).toBe('')
  })
})

describe('updateIssueIdea', () => {
  it('saves the idea to 改善アイディア property', async () => {
    mockClient.pages.update.mockResolvedValue({})

    await updateIssueIdea('page-id-123', '具体的な改善アイディア')

    expect(mockClient.pages.update).toHaveBeenCalledWith({
      page_id: 'page-id-123',
      properties: {
        改善アイディア: { rich_text: [{ text: { content: '具体的な改善アイディア' } }] },
      },
    })
  })

  it('clears the idea when empty string is passed', async () => {
    mockClient.pages.update.mockResolvedValue({})

    await updateIssueIdea('page-id-123', '')

    expect(mockClient.pages.update).toHaveBeenCalledWith({
      page_id: 'page-id-123',
      properties: {
        改善アイディア: { rich_text: [] },
      },
    })
  })
})
