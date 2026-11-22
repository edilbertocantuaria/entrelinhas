import { NextResponse, type NextRequest } from 'next/server'
import { complete, LLMError, readJSON, status } from '@/lib/ai/llm'
import { isPromptId, PROMPTS } from '@/utils/prompts'

export const runtime = 'nodejs'

/** Limite do corpo da requisição: o diário de um trimestre cabe com folga. */
const MAX_BODY = 120_000

/** GET /api/ia: quais IAs têm chave e em que ordem são tentadas (sem revelar as chaves). */
export function GET() {
  return NextResponse.json(status())
}

/**
 * POST /api/ia  { "prompt": "resumo-mensal", "entrada": { ... } }
 * Monta o prompt da situação, chama o modelo e devolve o JSON já validado.
 */
export async function POST(request: NextRequest) {
  // só aceita chamadas do próprio app (proteção simples; com login de verdade, conferir a sessão aqui)
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 })

  const raw = await request.text()
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'Pedido grande demais.' }, { status: 413 })

  let body: { prompt?: unknown; entrada?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  if (!isPromptId(body.prompt) || typeof body.entrada !== 'object' || body.entrada === null)
    return NextResponse.json({ error: 'Prompt desconhecido ou entrada vazia.' }, { status: 400 })

  const def = PROMPTS[body.prompt]
  try {
    // a mesma entrada vale para qualquer prompt: cada um sabe ler a sua
    const user = (def.user as (entrada: unknown) => string)(body.entrada)
    const result = await complete({ system: def.system, user, maxTokens: def.maxTokens }, body.prompt)
    const data = (def.parse as (bruto: unknown) => unknown)(readJSON(result.text))
    if (!data) return NextResponse.json({ error: 'A IA respondeu fora do formato esperado.' }, { status: 502 })
    return NextResponse.json({ data, provider: result.provider, model: result.model })
  } catch (error) {
    const code = error instanceof LLMError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Erro ao chamar a IA.'
    console.error(`[api/ia] ${body.prompt}: ${message}`)
    return NextResponse.json({ error: code === 503 ? message : 'Não deu para falar com a IA agora.' }, { status: code >= 400 && code < 600 ? code : 502 })
  }
}
