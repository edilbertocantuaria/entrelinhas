import type { EntradaDe, PromptId, SaidaDe } from '@/utils/prompts'

/** Pede à rota /api/ia o texto de uma situação. Lança erro se a IA estiver fora ou não configurada. */
export async function askAI<Id extends PromptId>(prompt: Id, entrada: EntradaDe<Id>): Promise<SaidaDe<Id>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('offline')
  const response = await fetch('/api/ia', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, entrada }),
  })
  const body = (await response.json().catch(() => ({}))) as { data?: SaidaDe<Id>; error?: string }
  if (!response.ok || !body.data) throw new Error(body.error ?? `Erro ${response.status}`)
  return body.data
}
