import { Client } from '@notionhq/client'
import type { NotionIssue, IssueStatus } from '@/types/notion'

type RawPage = { id: string; created_time: string; properties: Record<string, unknown> }

function getClient(): Client {
  return new Client({ auth: process.env.NOTION_TOKEN })
}

function getDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID
  if (!id) throw new Error('NOTION_DATABASE_ID is not set')
  return id
}

function getDataSourceId(): string {
  const id = process.env.NOTION_DATA_SOURCE_ID
  if (!id) throw new Error('NOTION_DATA_SOURCE_ID is not set')
  return id
}

export async function createIssue(title: string): Promise<NotionIssue> {
  const notion = getClient()
  const page = await notion.pages.create({
    parent: { database_id: getDatabaseId() },
    properties: {
      課題タイトル: { title: [{ text: { content: title } }] },
      ステータス: { select: { name: 'Raw' } },
    },
  })

  const p = page as RawPage
  return {
    id: p.id,
    number: extractNumber(p.properties),
    title,
    status: 'Raw',
    createdAt: p.created_time,
  }
}

export async function listIssues(limit = 10): Promise<NotionIssue[]> {
  const notion = getClient()
  const response = await notion.dataSources.query({
    data_source_id: getDataSourceId(),
    sorts: [{ property: '記録日時', direction: 'descending' }],
    page_size: limit,
  })

  return response.results
    .filter((item) => 'created_time' in item)
    .map((item) => {
      const p = item as unknown as RawPage
      return {
        id: p.id,
        number: extractNumber(p.properties),
        title: extractTitle(p.properties),
        status: extractStatus(p.properties),
        createdAt: p.created_time,
      }
    })
}

function extractTitle(props: Record<string, unknown>): string {
  const prop = props['課題タイトル'] as { title?: Array<{ plain_text: string }> } | undefined
  return prop?.title?.[0]?.plain_text ?? ''
}

function extractStatus(props: Record<string, unknown>): IssueStatus {
  const prop = props['ステータス'] as { select?: { name: string } } | undefined
  return (prop?.select?.name ?? 'Raw') as IssueStatus
}

function extractNumber(props: Record<string, unknown>): number {
  const prop = props['通番'] as { unique_id?: { number: number } } | undefined
  return prop?.unique_id?.number ?? 0
}
