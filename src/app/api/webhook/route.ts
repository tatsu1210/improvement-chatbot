import { waitUntil } from '@vercel/functions'
import { verifyLineSignature } from '@/lib/verify-signature'
import { createIssue, listIssues, deleteIssue, getIssue, updateIssueIdea } from '@/services/notion'
import { generateImprovementIdea } from '@/services/ai'
import {
  replyWithIssueCreated,
  replyWithIssueList,
  replyWithError,
  replyWithRegisterPrompt,
  replyWithDeleteList,
  replyWithDeleteConfirm,
  replyWithImproveList,
  replyWithIdeaProposal,
  replyWithIdeaApproved,
  replyWithIdeaCancelled,
} from '@/services/line-reply'
import type { LineWebhookBody, LineMessageEvent, LinePostbackEvent } from '@/types/line-events'

const LIST_TRIGGERS = ['一覧を見る', '/list', '一覧', 'リスト']

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get('x-line-signature') ?? ''
  const secret = process.env.LINE_CHANNEL_SECRET ?? ''

  const isValid = await verifyLineSignature(secret, body, signature)
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body) as LineWebhookBody

  waitUntil(handleEvents(payload))

  return new Response('OK', { status: 200 })
}

async function handleEvents(payload: LineWebhookBody): Promise<void> {
  for (const event of payload.events) {
    if (event.type === 'message') {
      await handleMessageEvent(event as LineMessageEvent)
    } else if (event.type === 'postback') {
      await handlePostbackEvent(event as LinePostbackEvent)
    }
  }
}

async function handleMessageEvent(event: LineMessageEvent): Promise<void> {
  if (event.message.type !== 'text') return

  const text = event.message.text.trim()
  const { replyToken } = event

  try {
    if (LIST_TRIGGERS.includes(text)) {
      const issues = await listIssues()
      await replyWithIssueList(replyToken, issues)
    } else {
      const issue = await createIssue(text)
      await replyWithIssueCreated(replyToken, issue)
    }
  } catch {
    await replyWithError(replyToken)
  }
}

async function handlePostbackEvent(event: LinePostbackEvent): Promise<void> {
  const { replyToken } = event
  const params = new URLSearchParams(event.postback.data)
  const action = params.get('action')

  try {
    if (action === 'register') {
      await replyWithRegisterPrompt(replyToken)
    } else if (action === 'list') {
      const issues = await listIssues()
      await replyWithIssueList(replyToken, issues)
    } else if (action === 'show_delete_list') {
      const issues = await listIssues()
      await replyWithDeleteList(replyToken, issues)
    } else if (action === 'delete') {
      const issueId = params.get('issueId')
      if (!issueId) throw new Error('issueId is missing')
      await deleteIssue(issueId)
      await replyWithDeleteConfirm(replyToken)
    } else if (action === 'show_improve_list') {
      const issues = await listIssues()
      await replyWithImproveList(replyToken, issues)
    } else if (action === 'improve') {
      const issueId = params.get('issueId')
      if (!issueId) throw new Error('issueId is missing')
      const issue = await getIssue(issueId)
      const idea = await generateImprovementIdea(issue.title)
      await updateIssueIdea(issueId, idea)
      await replyWithIdeaProposal(replyToken, issue, idea)
    } else if (action === 'approve_idea') {
      await replyWithIdeaApproved(replyToken)
    } else if (action === 'cancel_idea') {
      const issueId = params.get('issueId')
      if (!issueId) throw new Error('issueId is missing')
      await updateIssueIdea(issueId, '')
      await replyWithIdeaCancelled(replyToken)
    }
  } catch {
    await replyWithError(replyToken)
  }
}
