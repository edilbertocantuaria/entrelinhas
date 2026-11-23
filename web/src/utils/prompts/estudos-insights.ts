import { bloco, cortar, isObj, juntar, listaTextos, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaEstudos {
  /** "últimos 30 dias" */
  periodo: string
  disciplinas: { nome: string; minutos: number; sessoes: number; acertos?: { feitas: number; certas: number } }[]
  anotacoes: { tipo: 'dificuldade' | 'progresso' | 'insight'; disciplina: string; data: string; texto: string }[]
}

export interface SaidaEstudos {
  /** leitura geral do período */
  leitura: string
  /** até 3 assuntos para revisar, tirados das dificuldades */
  revisar: string[]
  /** até 2 pontos fortes, tirados dos progressos */
  forcas: string[]
}

export const estudosInsights: PromptDef<EntradaEstudos, SaidaEstudos> = {
  id: 'estudos-insights',
  quando: 'No módulo Estudos, num botão "Ler minhas anotações", que organiza dificuldades, progressos e insights.',
  system: `${TOM}

Tarefa: ler as sessões e anotações de estudo e devolver uma leitura curta e útil.

O que devolver:
- "leitura": de 50 a 90 palavras sobre o período: onde o tempo foi, como os acertos se movem, o que as anotações mostram.
- "revisar": até 3 assuntos concretos para revisar, tirados das dificuldades anotadas, cada um com até 10 palavras. Lista vazia se não houver dificuldades.
- "forcas": até 2 pontos que melhoraram, tirados dos progressos e dos acertos, cada um com até 12 palavras.
- Não invente conteúdos de prova nem matérias que não aparecem nos dados.

Responda neste formato:
{"leitura": "...", "revisar": ["..."], "forcas": ["..."]}`,
  user: entrada =>
    juntar(
      `Período: ${entrada.periodo}`,
      bloco(
        'Disciplinas',
        entrada.disciplinas.map(item => `- ${item.nome}: ${item.minutos} min em ${item.sessoes} sessões${item.acertos ? `, ${item.acertos.certas} de ${item.acertos.feitas} questões certas` : ''}`),
      ),
      bloco('Anotações', entrada.anotacoes.slice(0, 40).map(item => `- ${item.data} · ${item.disciplina} · ${item.tipo}: ${cortar(item.texto, 240)}`)),
    ),
  maxTokens: 500,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const leitura = texto(bruto.leitura, 900)
    return leitura ? { leitura, revisar: listaTextos(bruto.revisar, 3, 120), forcas: listaTextos(bruto.forcas, 2, 140) } : null
  },
}
