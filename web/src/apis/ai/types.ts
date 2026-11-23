/**
 * Contrato comum das IAs. Cada provedor (OpenAI, Anthropic, Gemini...) é um adaptador
 * em src/apis/ai/providers que recebe o mesmo pedido e devolve só o texto da resposta.
 */

export interface CompletionRequest {
  /** instruções fixas do prompt (tom, regras, formato) */
  system: string
  /** mensagem com os dados do momento */
  user: string
  /** tamanho esperado da resposta, em tokens */
  maxTokens: number
}

export interface ProviderCall {
  apiKey: string
  model: string
  /** encerra a chamada se demorar demais */
  signal: AbortSignal
}

export interface Provider {
  /** nome usado no .env (LLM_PROVIDER, LLM_FALLBACK, LLM_ROUTES) */
  id: string
  label: string
  /** variável do .env com a chave */
  keyEnv: string
  /** variável do .env com o modelo deste provedor (opcional) */
  modelEnv: string
  /** modelo usado quando o .env não diz qual */
  defaultModel: string
  complete: (request: CompletionRequest, call: ProviderCall) => Promise<string>
}

export class LLMError extends Error {
  constructor(
    message: string,
    /** 503 = sem chave; 502 = o serviço respondeu com erro; 504 = demorou demais */
    readonly status: number,
    /** vale tentar o próximo provedor da lista de reserva */
    readonly retryable = status >= 500 || status === 429,
  ) {
    super(message)
  }
}
