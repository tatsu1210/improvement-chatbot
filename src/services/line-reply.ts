import type { NotionIssue } from '@/types/notion'
import { formatIssueList } from '@/lib/formatter'
import { buildDeleteListFlexMessage } from '@/lib/flex-message'
import { buildImproveListFlexMessage, buildIdeaProposalFlexMessage } from '@/lib/improve-flex-message'

const REPLY_URL = 'https://api.line.me/v2/bot/message/reply'

const MENU_QUICK_REPLY = {
  items: [
    {
      type: 'action',
      action: { type: 'postback', label: '📝 課題登録', data: 'action=register' },
    },
    {
      type: 'action',
      action: { type: 'postback', label: '🗑️ 課題削除', data: 'action=show_delete_list' },
    },
    {
      type: 'action',
      action: { type: 'postback', label: '📋 課題一覧', data: 'action=list' },
    },
    {
      type: 'action',
      action: { type: 'postback', label: '💡 改善アイディア', data: 'action=show_improve_list' },
    },
  ],
}

async function replyMessage(replyToken: string, messages: object[]): Promise<void> {
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
    { type: 'text', text, quickReply: MENU_QUICK_REPLY },
  ])
}

export async function replyWithIssueList(
  replyToken: string,
  issues: NotionIssue[]
): Promise<void> {
  const text = formatIssueList(issues)
  await replyMessage(replyToken, [
    { type: 'text', text, quickReply: MENU_QUICK_REPLY },
  ])
}

export async function replyWithRegisterPrompt(replyToken: string): Promise<void> {
  await replyMessage(replyToken, [
    {
      type: 'text',
      text: '📝 登録したい課題のタイトルを入力してください。',
    },
  ])
}

export async function replyWithDeleteList(
  replyToken: string,
  issues: NotionIssue[]
): Promise<void> {
  if (issues.length === 0) {
    await replyMessage(replyToken, [
      { type: 'text', text: '🗑️ 削除できる課題がありません。', quickReply: MENU_QUICK_REPLY },
    ])
    return
  }

  await replyMessage(replyToken, [buildDeleteListFlexMessage(issues)])
}

export async function replyWithDeleteConfirm(replyToken: string): Promise<void> {
  await replyMessage(replyToken, [
    {
      type: 'text',
      text: '🗑️ 課題を削除しました。',
      quickReply: MENU_QUICK_REPLY,
    },
  ])
}

export async function replyWithError(replyToken: string): Promise<void> {
  await replyMessage(replyToken, [
    { type: 'text', text: '⚠️ エラーが発生しました。しばらくしてから再度お試しください。' },
  ])
}

export async function replyWithImproveList(
  replyToken: string,
  issues: NotionIssue[]
): Promise<void> {
  if (issues.length === 0) {
    await replyMessage(replyToken, [
      { type: 'text', text: '💡 改善アイディアを作成できる課題がありません。', quickReply: MENU_QUICK_REPLY },
    ])
    return
  }

  await replyMessage(replyToken, [buildImproveListFlexMessage(issues)])
}

export async function replyWithIdeaProposal(
  replyToken: string,
  issue: NotionIssue,
  idea: string
): Promise<void> {
  await replyMessage(replyToken, [buildIdeaProposalFlexMessage(issue, idea)])
}

export async function replyWithIdeaApproved(replyToken: string): Promise<void> {
  await replyMessage(replyToken, [
    {
      type: 'text',
      text: '✅ 改善アイディアをNotionに登録しました！',
      quickReply: MENU_QUICK_REPLY,
    },
  ])
}

export async function replyWithIdeaCancelled(replyToken: string): Promise<void> {
  await replyMessage(replyToken, [
    {
      type: 'text',
      text: '❌ 改善アイディアの作成をキャンセルしました。',
      quickReply: MENU_QUICK_REPLY,
    },
  ])
}
