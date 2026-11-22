/**
 * Chamada ao modelo de linguagem. Roda só no servidor: a chave da API nunca vai para o navegador.
 *
 * Configuração no .env:
 *   LLM_PROVIDER   openai | anthropic | gemini (se a chave dele estiver vazia, usa a que estiver preenchida)
 *   LLM_MODEL      opcional; vazio = o padrão abaixo
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
 */

type Provider = 'openai' | 'anthropic' | 'gemini'

const KEYS: Record<Provider, string> = { openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' }

/** Modelos rápidos e baratos, bons para textos curtos. Troque em LLM_MODEL se quiser outro. */
const DEFAULT_MODEL: Record<Provider, string> = { openai: 'gpt-4.1-mini', anthropic: 'claude-sonnet-5-5', gemini: 'gemini-2.5-flash' }

const TIMEOUT_MS = 30_000

export class LLMError extends Error {
  constructor(
    message: string,
    /** 503 = IA não configurada; 502 = o serviço respondeu com erro */
    readonly status: number,
  ) {
    super(message)
  }
}

function config() {
  const key = (provider: Provider) => process.env[KEYS[provider]]?.trim() ?? ''
  const wanted = process.env.LLM_PROVIDER?.trim().toLowerCase() as Provider | undefined
  const order: Provider[] = wanted && wanted in KEYS ? [wanted, 'openai', 'anthropic', 'gemini'] : ['openai', 'anthropic', 'gemini']
  const provider = order.find(item => key(item))
  if (!provider) throw new LLMError('Nenhuma chave de IA configurada no .env.', 503)
  // o modelo do .env só vale para o provedor escolhido em LLM_PROVIDER
  const model = (provider === wanted && process.env.LLM_MODEL?.trim()) || DEFAULT_MODEL[provider]
  return { provider, model, apiKey: key(provider) }
}

export const llmConfigured = () => {
  try {
    config()
    return true
  } catch {
    return false
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) {
    const detail = (data?.error as { message?: string } | undefined)?.message ?? response.statusText
    throw new LLMError(`O serviço de IA respondeu ${response.status}: ${detail}`, 502)
  }
  return data ?? {}
}

/** Manda as instruções e a mensagem e devolve o texto da resposta. */
export async function complete({ system, user, maxTokens }: { system: string; user: string; maxTokens: number }): Promise<string> {
  const { provider, model, apiKey } = config()

  if (provider === 'openai') {
    const data = await post(
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
    )
    const choices = data.choices as { message?: { content?: string } }[] | undefined
    return choices?.[0]?.message?.content ?? ''
  }

  if (provider === 'anthropic') {
    const data = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      { model, system, max_tokens: maxTokens, messages: [{ role: 'user', content: user }] },
    )
    const content = data.content as { type: string; text?: string }[] | undefined
    return content?.filter(part => part.type === 'text').map(part => part.text ?? '').join('') ?? ''
  }

  const data = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { 'x-goog-api-key': apiKey },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: maxTokens },
    },
  )
  const candidates = data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined
  return candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? ''
}

/** Lê o JSON da resposta, tolerando um bloco ```json em volta. */
export function readJSON(text: string): unknown {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim()
  try {
    return JSON.parse(clean)
  } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}
