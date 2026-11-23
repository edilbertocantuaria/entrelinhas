/**
 * IAs disponíveis no app.
 *
 * Para ligar uma IA nova (Mistral, DeepSeek, um modelo local...):
 *   1. crie um arquivo nesta pasta exportando um `Provider` (veja openai.ts como modelo);
 *   2. acrescente-o na lista abaixo;
 *   3. ponha a chave no .env, na variável indicada em `keyEnv`.
 * Os prompts em utils/prompts não mudam: todas as IAs recebem o mesmo pedido.
 */
import type { Provider } from '../types'
import { anthropic } from './anthropic'
import { gemini } from './gemini'
import { openai } from './openai'

export const PROVIDERS: Provider[] = [openai, anthropic, gemini]

export const providerById = (id: string | undefined) => PROVIDERS.find(provider => provider.id === id?.trim().toLowerCase())
