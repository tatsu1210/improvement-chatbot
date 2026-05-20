import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { generateImprovementIdea } from '@/services/ai'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.OPENROUTER_API_KEY = 'test-api-key'
})

describe('generateImprovementIdea', () => {
  it('calls OpenRouter API and returns the idea text', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '週次MTGを月2回に削減し、事前にアジェンダを共有する。' } }],
      }),
    })

    const result = await generateImprovementIdea('週次MTGが長すぎる')

    expect(result).toBe('週次MTGを月2回に削減し、事前にアジェンダを共有する。')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }),
      })
    )
  })

  it('includes the issue title in the request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'アイディア' } }],
      }),
    })

    await generateImprovementIdea('コードレビューが遅い')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].content).toContain('コードレビューが遅い')
  })

  it('trims whitespace from the returned idea', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '  アイディアテキスト\n' } }],
      }),
    })

    const result = await generateImprovementIdea('課題')

    expect(result).toBe('アイディアテキスト')
  })

  it('throws when OPENROUTER_API_KEY is not set', async () => {
    delete process.env.OPENROUTER_API_KEY

    await expect(generateImprovementIdea('テスト')).rejects.toThrow('OPENROUTER_API_KEY is not set')
  })

  it('throws when API returns non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 })

    await expect(generateImprovementIdea('テスト')).rejects.toThrow('OpenRouter API error: 429')
  })
})
