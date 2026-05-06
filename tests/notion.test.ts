import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(),
}))

import { Client } from '@notionhq/client'
import { deleteIssue, listIssues } from '@/services/notion'

const mockClient = {
  pages: {
    create: vi.fn(),
    update: vi.fn(),
  },
  dataSources: {
    query: vi.fn(),
  },
}

const makeRawResult = (title: string, status: string, number: number) => ({
  created_time: '2026-01-01T00:00:00Z',
  properties: {
    課題タイトル: { title: [{ plain_text: title }] },
    ステータス: { select: { name: status } },
    通番: { unique_id: { number } },
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Client).mockImplementation(() => mockClient as unknown as InstanceType<typeof Client>)
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
