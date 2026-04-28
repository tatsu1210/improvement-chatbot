export interface LineTextMessage {
  type: 'text'
  text: string
}

export interface LineMessageEvent {
  type: 'message'
  replyToken: string
  webhookEventId: string
  message: LineTextMessage
  source: { userId: string }
}

export interface LineWebhookBody {
  events: Array<LineMessageEvent | { type: string; replyToken?: string }>
}
