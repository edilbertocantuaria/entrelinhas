import type { Provider } from '@/apis/ai/types'
import { postJSON } from '@/apis/ai/providers/http'

/** Google Gemini, pela API generateContent com resposta em JSON. */
export const gemini: Provider = {
  id: 'gemini',
  label: 'Google Gemini',
  keyEnv: 'GEMINI_API_KEY',
  modelEnv: 'GEMINI_MODEL',
  defaultModel: 'gemini-2.5-flash',
  async complete({ system, user, maxTokens }, { apiKey, model, signal }) {
    const data = await postJSON(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      // a chave vai no cabeçalho, não na URL, para não aparecer em logs
      { 'x-goog-api-key': apiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: Math.max(maxTokens, 2048) },
      },
      signal,
    )
    const candidates = data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined
    return candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? ''
  },
}
