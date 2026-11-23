/**
 * Escolhe a IA de cada pedido e faz a chamada. Roda só no servidor: as chaves nunca vão para o navegador.
 *
 * Configuração no .env (só a chave é obrigatória):
 *   LLM_PROVIDER    IA principal: openai | anthropic | gemini
 *   LLM_MODEL       modelo da IA principal (vazio = o padrão do adaptador)
 *   OPENAI_MODEL, ANTHROPIC_MODEL, GEMINI_MODEL
 *                   modelo de cada IA quando ela entra como reserva ou por rota
 *   LLM_FALLBACK    IAs de reserva, em ordem, se a principal falhar (ex.: "anthropic,gemini")
 *   LLM_ROUTES      IA por situação (ex.: "resumo-trimestral=anthropic,estudos-insights=gemini")
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
 *
 * Uma IA sem chave preenchida é pulada. Sem nenhuma chave, a rota responde 503 e o app usa o texto só com números.
 */
import { PROVIDERS, providerById } from '@/apis/ai/providers'
import { LLMError, type CompletionRequest, type Provider } from '@/apis/ai/types'

export { LLMError }

const TIMEOUT_MS = 45_000

const env = (name: string) => process.env[name]?.trim() ?? ''
const hasKey = (provider: Provider) => !!env(provider.keyEnv)
const list = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

/** "resumo-trimestral=anthropic,estudos-insights=gemini" vira { 'resumo-trimestral': 'anthropic', ... } */
function routes(): Record<string, string> {
  return Object.fromEntries(
    list(env('LLM_ROUTES'))
      .map(pair => pair.split('=').map(part => part.trim()) as [string, string])
      .filter(([key, value]) => key && value),
  )
}

/** Ordem de tentativa para um prompt: rota da situação, principal, reservas e, por fim, qualquer outra com chave. */
export function plan(promptId?: string): { provider: Provider; model: string }[] {
  const main = providerById(env('LLM_PROVIDER'))
  const ids = [promptId ? routes()[promptId] : undefined, main?.id, ...list(env('LLM_FALLBACK')), ...PROVIDERS.map(provider => provider.id)]
  const seen = new Set<string>()
  const order: { provider: Provider; model: string }[] = []
  for (const id of ids) {
    const provider = providerById(id)
    if (!provider || seen.has(provider.id) || !hasKey(provider)) continue
    seen.add(provider.id)
    // LLM_MODEL vale só para a principal; as outras usam OPENAI_MODEL / ANTHROPIC_MODEL / GEMINI_MODEL
    const model = (provider === main && env('LLM_MODEL')) || env(provider.modelEnv) || provider.defaultModel
    order.push({ provider, model })
  }
  return order
}

/** Situação das IAs para a rota GET, sem expor chaves. */
export function status() {
  return {
    configured: plan().length > 0,
    order: plan().map(({ provider, model }) => ({ provider: provider.id, model })),
    available: PROVIDERS.map(provider => ({ provider: provider.id, label: provider.label, hasKey: hasKey(provider) })),
  }
}

/** Manda o pedido para a primeira IA da lista; se ela falhar de um jeito que vale tentar de novo, passa para a próxima. */
export async function complete(request: CompletionRequest, promptId?: string): Promise<{ text: string; provider: string; model: string }> {
  const order = plan(promptId)
  if (!order.length) throw new LLMError('Nenhuma chave de IA configurada no .env.', 503, false)
  let lastError: unknown
  for (const { provider, model } of order) {
    try {
      const text = await provider.complete(request, { apiKey: env(provider.keyEnv), model, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (text.trim()) return { text, provider: provider.id, model }
      lastError = new LLMError(`${provider.label} devolveu uma resposta vazia`, 502)
    } catch (error) {
      const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      lastError = timeout ? new LLMError(`${provider.label} demorou demais`, 504, true) : error
      console.warn(`[ia] ${provider.label} (${model}) falhou:`, lastError instanceof Error ? lastError.message : lastError)
      if (lastError instanceof LLMError && !lastError.retryable && lastError.status !== 401 && lastError.status !== 403) break
    }
  }
  throw lastError instanceof LLMError ? lastError : new LLMError(lastError instanceof Error ? lastError.message : 'Erro ao chamar a IA.', 502)
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
