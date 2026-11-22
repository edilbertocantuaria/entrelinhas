import type { Provider } from '../types'
import { postJSON } from './http'

/** OpenAI (GPT), pela API de Chat Completions em modo JSON. */
export const openai: Provider = {
  id: 'openai',
  label: 'OpenAI',
  keyEnv: 'OPENAI_API_KEY',
  modelEnv: 'OPENAI_MODEL',
  defaultModel: 'gpt-4.1-mini',
  async complete({ system, user, maxTokens }, { apiKey, model, signal }) {
    const data = await postJSON(
      'https://api.openai.com/v1/chat/completions',
      { authorization: `Bearer ${apiKey}` },
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: maxTokens,
      },
      signal,
    )
    const choices = data.choices as { message?: { content?: string } }[] | undefined
    return choices?.[0]?.message?.content ?? ''
  },
}
