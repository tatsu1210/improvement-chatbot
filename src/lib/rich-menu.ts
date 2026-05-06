import { createSectionedPng } from './create-png'

const LINE_API = 'https://api.line.me/v2/bot'
const LINE_DATA_API = 'https://api-data.line.me/v2/bot'

function getToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set')
  return token
}

function authHeader() {
  return { Authorization: `Bearer ${getToken()}` }
}

async function deleteAllRichMenus(): Promise<void> {
  const res = await fetch(`${LINE_API}/richmenu/list`, {
    headers: authHeader(),
  })
  if (!res.ok) return

  const data = (await res.json()) as { richmenus: Array<{ richMenuId: string }> }
  await Promise.all(
    data.richmenus.map((m) =>
      fetch(`${LINE_API}/richmenu/${m.richMenuId}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
    )
  )
}

async function createRichMenu(): Promise<string> {
  const body = {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'Main Menu',
    chatBarText: 'メニュー',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'postback', label: '課題登録', data: 'action=register' },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'postback', label: '課題削除', data: 'action=show_delete_list' },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'postback', label: '課題一覧', data: 'action=list' },
      },
    ],
  }

  const res = await fetch(`${LINE_API}/richmenu`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Rich Menu作成失敗: ${text}`)
  }

  const data = (await res.json()) as { richMenuId: string }
  return data.richMenuId
}

async function uploadRichMenuImage(richMenuId: string, png: Buffer): Promise<void> {
  const res = await fetch(`${LINE_DATA_API}/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'image/png' },
    body: new Blob([new Uint8Array(png)], { type: 'image/png' }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`画像アップロード失敗: ${text}`)
  }
}

async function setDefaultRichMenu(richMenuId: string): Promise<void> {
  const res = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: authHeader(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`デフォルト設定失敗: ${text}`)
  }
}

export async function setupRichMenu(): Promise<void> {
  console.log('既存のRich Menuを削除中...')
  await deleteAllRichMenus()

  console.log('Rich Menuを作成中...')
  const richMenuId = await createRichMenu()

  console.log('メニュー画像を生成中...')
  const png = await createSectionedPng(2500, 843, [
    { color: [52, 168, 83],  icon: '＋', label: '課題登録' },
    { color: [234, 67, 53],  icon: '✕', label: '課題削除' },
    { color: [66, 133, 244], icon: '☰', label: '課題一覧' },
  ])

  console.log('画像をアップロード中...')
  await uploadRichMenuImage(richMenuId, png)

  console.log('デフォルトメニューとして設定中...')
  await setDefaultRichMenu(richMenuId)

  console.log(`✅ Rich Menu設定完了 (ID: ${richMenuId})`)
}
