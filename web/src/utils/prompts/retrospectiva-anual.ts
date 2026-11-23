import { bloco, cortar, isObj, juntar, listaTextos, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaRetrospectiva {
  ano: number
  /** "novembro", quando a pessoa começou a usar o app no meio do ano */
  comecouEm?: string
  numeros: { diasComDiario: number; tarefasFeitas: number; metasAtivas: number }
  porArea: { area: string; linha: string }[]
  metas: { meta: string; progresso: string; situacao: 'concluída' | 'no ritmo' | 'adiantado' | 'um pouco atrás' | 'sem registro' }[]
  humorPorMes: { mes: string; media: number }[]
  /** entradas candidatas a "Trechos que marcaram" */
  trechos: { data: string; texto: string }[]
  modulos?: string[]
}

export interface SaidaRetrospectiva {
  /** frase da capa, abaixo de "Seu 2026" */
  capa: string
  /** um parágrafo curto sobre o ano */
  ano: string
  /** frase gentil para "O que ficou para depois" */
  depois: string
  /** datas dos 3 trechos escolhidos, em ordem */
  trechos: string[]
  /** rascunho da "Carta para o próximo ano", na voz da própria pessoa */
  carta: string
}

export const retrospectivaAnual: PromptDef<EntradaRetrospectiva, SaidaRetrospectiva> = {
  id: 'retrospectiva-anual',
  quando: 'Na data da retrospectiva (padrão: penúltima quinta de dezembro, 20h), ao montar os cartões.',
  system: `${TOM}

Tarefa: escrever os textos da retrospectiva anual, que aparece como uma sequência de cartões.

O que devolver:
- "capa": uma frase de até 14 palavras para a capa. Se a pessoa começou no meio do ano, reconheça isso.
- "ano": um parágrafo de 60 a 100 palavras sobre o ano, com no máximo três números.
- "depois": uma ou duas frases para as metas que ficaram para depois. Sem culpa: elas seguem com a pessoa, se ainda fizerem sentido. Se nenhuma ficou para trás, diga isso com leveza.
- "trechos": as datas (no formato recebido) de até 3 entradas do diário que melhor contam o ano. Prefira momentos de virada, conquistas pequenas e cuidado consigo. Evite trechos com detalhes muito íntimos de terceiros.
- "carta": um rascunho de 50 a 90 palavras escrito na primeira pessoa, da pessoa para ela mesma no ano seguinte. Comece com "Oi, eu de" seguido do próximo ano. A pessoa vai editar, então seja simples.

Responda neste formato:
{"capa": "...", "ano": "...", "depois": "...", "trechos": ["aaaa-mm-dd"], "carta": "..."}`,
  user: entrada =>
    juntar(
      `Ano: ${entrada.ano}${entrada.comecouEm ? ` (começou a usar o app em ${entrada.comecouEm})` : ''}`,
      bloco('Números', [`- dias com diário: ${entrada.numeros.diasComDiario}`, `- tarefas feitas: ${entrada.numeros.tarefasFeitas}`, `- metas ativas: ${entrada.numeros.metasAtivas}`]),
      bloco('Por área', entrada.porArea.map(item => `- ${item.area}: ${item.linha}`)),
      bloco('Metas', entrada.metas.map(item => `- ${item.meta}: ${item.progresso} (${item.situacao})`)),
      bloco('Humor médio por mês', entrada.humorPorMes.map(item => `- ${item.mes}: ${item.media.toFixed(1).replace('.', ',')} de 5`)),
      bloco('Módulos', (entrada.modulos ?? []).map(linha => `- ${linha}`)),
      bloco('Entradas do diário', entrada.trechos.slice(-60).map(item => `- ${item.data}: ${cortar(item.texto.replace(/\s+/g, ' '), 400)}`)),
    ),
  maxTokens: 1000,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const capa = texto(bruto.capa, 160)
    const ano = texto(bruto.ano, 1200)
    const depois = texto(bruto.depois, 400)
    const carta = texto(bruto.carta, 1200)
    if (!capa || !ano || !depois || !carta) return null
    return { capa, ano, depois, carta, trechos: listaTextos(bruto.trechos, 3, 10).filter(data => /^\d{4}-\d{2}-\d{2}$/.test(data)) }
  },
}
