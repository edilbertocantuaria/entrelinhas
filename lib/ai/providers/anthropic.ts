import Anthropic from '@anthropic-ai/sdk'
import { LLMError, type Provider } from '../types'

/**
 * Anthropic (Claude), pelo SDK oficial.
 * - O modelo pensa antes de responder (não dá para desligar no Opus 5.5); o esforço fica em "low",
 *   que basta para textos curtos. Por isso o limite de tokens tem folga: o raciocínio também conta.
 * - "fallbacks: default": se o modelo recusar o pedido por política, a própria API tenta outro
 *   modelo Claude na mesma chamada.
 */
export const anthropic: Provider = {
  id: 'anthropic',
  label: 'Anthropic',
  keyEnv: 'ANTHROPIC_API_KEY',
  modelEnv: 'ANTHROPIC_MODEL',
  defaultModel: 'claude-opus-5-5',
  async complete({ system, user }, { apiKey, model, signal }) {
    const client = new Anthropic({ apiKey, maxRetries: 1 })
    try {
      const response = await client.beta.messages.create(
        {
          model,
          max_tokens: 16000,
          system,
          messages: [{ role: 'user', content: user }],
          output_config: { effort: 'low' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { signal },
      )
      if (response.stop_reason === 'refusal') throw new LLMError('o modelo recusou o pedido', 502, false)
      if (response.stop_reason === 'max_tokens') throw new LLMError('a resposta foi cortada no limite de tokens', 502)
      return response.content.map(block => (block.type === 'text' ? block.text : '')).join('')
    } catch (error) {
      if (error instanceof LLMError) throw error
      if (error instanceof Anthropic.RateLimitError) throw new LLMError('limite de uso atingido', 502, true)
      if (error instanceof Anthropic.AuthenticationError) throw new LLMError('chave inválida', 401, false)
      if (error instanceof Anthropic.BadRequestError) throw new LLMError(`pedido recusado: ${error.message}`, 400, false)
      if (error instanceof Anthropic.APIError) throw new LLMError(`respondeu ${error.status}: ${error.message}`, 502, (error.status ?? 500) >= 500)
      throw error
    }
  },
}
