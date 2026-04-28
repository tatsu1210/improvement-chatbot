import type { NotionIssue } from '@/types/notion'
import { formatIssueList } from '@/lib/formatter'

const REPLY_URL = 'https://api.line.me/v2/bot/message/reply'

const LIST_QUICK_REPLY = {
  items: [
    {
      type: 'action',
      action: { type: 'message', label: '📋 一覧を見る', text: '一覧を見る' },
    },
  ],
}

async function replyMessage(
  replyToken: string,
  messages: object[]
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set')

  await fetch(REPLY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

export async function replyWithIssueCreated(
  replyToken: string,
  issue: NotionIssue
): Promise<void> {
  const text = `✅ 課題を登録しました！\n\n#${issue.number}「${issue.title}」`
  await replyMessage(replyToken, [
    { type: 'text', text, quickReply: LIST_QUICK_REPLY },
  ])
}

export async function replyWithIssueList(
  replyToken: string,
  issues: NotionIssue[]
): Promise<void> {
  const text = formatIssueList(issues)
  await replyMessage(replyToken, [
    { type: 'text', text, quickReply: LIST_QUICK_REPLY },
  ])
}

export async function replyWithError(replyToken: string): Promise<void> {
  await replyMessage(replyToken, [
    { type: 'text', text: '⚠️ エラーが発生しました。しばらくしてから再度お試しください。' },
  ])
}
