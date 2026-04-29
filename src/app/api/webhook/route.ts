import { waitUntil } from '@vercel/functions'
import { verifyLineSignature } from '@/lib/verify-signature'
import { createIssue, listIssues } from '@/services/notion'
import { replyWithIssueCreated, replyWithIssueList, replyWithError } from '@/services/line-reply'
import type { LineWebhookBody, LineMessageEvent } from '@/types/line-events'

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
    if (event.type !== 'message') continue
    const msgEvent = event as LineMessageEvent
    if (msgEvent.message.type !== 'text') continue

    const text = msgEvent.message.text.trim()
    const replyToken = msgEvent.replyToken

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
}
