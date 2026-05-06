export type IssueStatus = 'Raw' | '整理済み' | '対応中' | '完了' | '削除済み'

export interface NotionIssue {
  id: string
  number: number
  title: string
  status: IssueStatus
  createdAt: string
}
