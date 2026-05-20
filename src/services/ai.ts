export async function generateImprovementIdea(issueTitle: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4.5',
      messages: [
        {
          role: 'user',
          content: `あなたは職場改善の専門家です。以下の課題に対して、具体的で実践可能な改善アイディアを1つ提案してください。\n\n課題: ${issueTitle}\n\n改善アイディア（300文字以内で簡潔に）:`,
        },
      ],
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} ${body}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content.trim()
}
