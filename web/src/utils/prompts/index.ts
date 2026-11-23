/**
 * Todos os prompts de IA do app, um por situação.
 *
 *   tom.ts                  tom de voz e regras comuns (entra em todos)
 *   resumo-mensal.ts        resumo do mês, no dia 1º ou em "Gerar de novo"
 *   resumo-trimestral.ts    resumo do trimestre
 *   retrospectiva-anual.ts  textos dos cartões da retrospectiva de dezembro
 *   perguntas-reflexao.ts   perguntas de "Para o próximo período" no resumo
 *   meta-smart.ts           ajuda para detalhar uma meta nova (SMART)
 *   meta-chat.ts            chat "Criar meta com IA": conversa e propõe a meta inteira para revisão
 *   plano-do-dia.ts         sugestão de tarefas na Abertura do dia
 *   pergunta-diario.ts      pergunta para começar a escrever no Fechamento
 *   estudos-insights.ts     leitura das anotações do módulo Estudos
 *   fitness-progresso.ts    texto sobre os treinos do módulo Fitness
 *   modulo-resumo.ts        resumo dos módulos criados pela pessoa
 *
 * Os prompts só rodam no servidor (app/api/ia/route.ts), onde fica a chave da API.
 */
import { estudosInsights } from './estudos-insights'
import { fitnessProgresso } from './fitness-progresso'
import { metaChat } from './meta-chat'
import { metaSmart } from './meta-smart'
import { moduloResumo } from './modulo-resumo'
import { perguntaDiario } from './pergunta-diario'
import { perguntasReflexao } from './perguntas-reflexao'
import { planoDoDia } from './plano-do-dia'
import { resumoMensal } from './resumo-mensal'
import { resumoTrimestral } from './resumo-trimestral'
import { retrospectivaAnual } from './retrospectiva-anual'
import type { PromptDef } from './tipos'

export const PROMPTS = {
  'resumo-mensal': resumoMensal,
  'resumo-trimestral': resumoTrimestral,
  'retrospectiva-anual': retrospectivaAnual,
  'perguntas-reflexao': perguntasReflexao,
  'meta-smart': metaSmart,
  'meta-chat': metaChat,
  'plano-do-dia': planoDoDia,
  'pergunta-diario': perguntaDiario,
  'estudos-insights': estudosInsights,
  'fitness-progresso': fitnessProgresso,
  'modulo-resumo': moduloResumo,
} satisfies Record<string, PromptDef<never, unknown>>

export type PromptId = keyof typeof PROMPTS
export type EntradaDe<Id extends PromptId> = Parameters<(typeof PROMPTS)[Id]['user']>[0]
export type SaidaDe<Id extends PromptId> = NonNullable<ReturnType<(typeof PROMPTS)[Id]['parse']>>

export const isPromptId = (valor: unknown): valor is PromptId => typeof valor === 'string' && valor in PROMPTS

export type { EntradaPeriodo, SaidaPeriodo } from './resumo-periodo'
export type { CampoMeta, EntradaMetaChat, MetaProposta, SaidaMetaChat, SmartProgresso } from './meta-chat'
export type { PromptDef } from './tipos'
