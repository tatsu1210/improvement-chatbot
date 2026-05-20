import type { NotionIssue } from '@/types/notion'

const MAX_TITLE_LENGTH = 40

function truncate(text: string): string {
  return text.length > MAX_TITLE_LENGTH ? text.slice(0, MAX_TITLE_LENGTH) + '…' : text
}

function buildIssueSelectBubble(issue: NotionIssue) {
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
            label: '選択',
            data: `action=improve&issueId=${issue.id}`,
          },
          style: 'primary',
          color: '#4CAF50',
        },
      ],
    },
  }
}

export function buildImproveListFlexMessage(issues: NotionIssue[]) {
  return {
    type: 'flex',
    altText: `改善アイディアを作成する課題を選んでください（${issues.length}件）`,
    contents: {
      type: 'carousel',
      contents: issues.map(buildIssueSelectBubble),
    },
  }
}

const MAX_IDEA_LENGTH = 400

export function buildIdeaProposalFlexMessage(issue: NotionIssue, idea: string) {
  const displayIdea = idea.length > MAX_IDEA_LENGTH ? idea.slice(0, MAX_IDEA_LENGTH) + '…' : idea

  return {
    type: 'flex',
    altText: `改善アイディアの提案: ${truncate(idea)}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '💡 改善アイディア',
            weight: 'bold',
            size: 'md',
            color: '#4CAF50',
          },
          {
            type: 'text',
            text: `課題: ${truncate(issue.title)}`,
            size: 'sm',
            color: '#888888',
            wrap: true,
          },
          {
            type: 'separator',
          },
          {
            type: 'text',
            text: displayIdea,
            wrap: true,
            size: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '✅ OK',
              data: `action=approve_idea&issueId=${issue.id}`,
            },
            style: 'primary',
            color: '#4CAF50',
            flex: 1,
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '❌ キャンセル',
              data: `action=cancel_idea&issueId=${issue.id}`,
            },
            style: 'secondary',
            flex: 1,
          },
        ],
      },
    },
  }
}
