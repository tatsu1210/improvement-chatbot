import type { NotionIssue } from '@/types/notion'

const MAX_TITLE_LENGTH = 50

function truncate(text: string): string {
  return text.length > MAX_TITLE_LENGTH ? text.slice(0, MAX_TITLE_LENGTH) + '…' : text
}

export function formatIssueList(issues: NotionIssue[]): string {
  if (issues.length === 0) {
    return '📋 課題一覧\n\n登録された課題はありません。'
  }

  const lines = issues.map(
    (issue) => `#${issue.number} [${issue.status}] ${truncate(issue.title)}`
  )
  return `📋 課題一覧（最新${issues.length}件）\n\n${lines.join('\n')}`
}
