import type { NotionIssue } from '@/types/notion'

const MAX_TITLE_LENGTH = 40

function truncate(text: string): string {
  return text.length > MAX_TITLE_LENGTH ? text.slice(0, MAX_TITLE_LENGTH) + '…' : text
}

function buildIssueBubble(issue: NotionIssue) {
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `#${issue.number}`,
          size: 'sm',
          color: '#888888',
        },
        {
          type: 'text',
          text: truncate(issue.title),
          wrap: true,
          weight: 'bold',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '削除',
            data: `action=delete&issueId=${issue.id}`,
          },
          style: 'primary',
          color: '#FF4444',
        },
      ],
    },
  }
}

export function buildDeleteListFlexMessage(issues: NotionIssue[]) {
  return {
    type: 'flex',
    altText: `削除する課題を選んでください（${issues.length}件）`,
    contents: {
      type: 'carousel',
      contents: issues.map(buildIssueBubble),
    },
  }
}
