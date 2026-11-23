import { LLMError } from '../types'

/** POST com JSON para os provedores chamados por HTTP direto. */
export async function postJSON(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) {
    const detail = (data?.error as { message?: string } | undefined)?.message ?? response.statusText
    // erro do pedido (400) ou de chave (401/403) não melhora tentando de novo no mesmo provedor
    throw new LLMError(`respondeu ${response.status}: ${detail}`, response.status >= 500 || response.status === 429 ? 502 : response.status, response.status >= 500 || response.status === 429)
  }
  return data ?? {}
}
