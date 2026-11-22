import { bloco, isObj, juntar, listaTextos, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaPlanoDia {
  /** "segunda-feira, 16 de novembro" */
  dia: string
  /** limite diário de tarefas do Modo saudável */
  limite: number
  candidatas: { id: string; titulo: string; meta?: string; ritmo?: string; diasEsperando?: number; deOntem?: boolean }[]
  /** como foi ontem, se a pessoa fechou o dia */
  humorOntem?: number
}

export interface SaidaPlanoDia {
  /** ids escolhidos, no máximo o limite */
  escolhidas: string[]
  /** uma frase curta explicando a escolha */
  frase: string
}

export const planoDoDia: PromptDef<EntradaPlanoDia, SaidaPlanoDia> = {
  id: 'plano-do-dia',
  quando: 'Na Abertura do dia, como sugestão de quais tarefas marcar. A pessoa sempre pode mudar.',
  system: `${TOM}

Tarefa: sugerir quais tarefas entram no dia, respeitando o limite diário.

Regras:
- Escolha no máximo o número do limite. Escolher menos é bom quando o dia anterior foi difícil.
- Dê preferência a metas que estão um pouco atrás e a tarefas que esperam há mais tempo, sem encher o dia.
- Use somente ids que estão na lista.
- "frase": até 22 palavras explicando a escolha, sem dar ordens. Ex.: "Deixei o dia mais leve, com o estudo e o treino, que estão um pouco atrás."

Responda neste formato:
{"escolhidas": ["id1", "id2"], "frase": "..."}`,
  user: entrada =>
    juntar(
      `Dia: ${entrada.dia}`,
      `Limite diário: ${entrada.limite}`,
      entrada.humorOntem ? `Humor de ontem: ${entrada.humorOntem} de 5` : '',
      bloco(
        'Tarefas possíveis',
        entrada.candidatas.map(
          item =>
            `- id ${item.id}: ${item.titulo}${item.meta ? ` (meta: ${item.meta}${item.ritmo ? `, ${item.ritmo}` : ''})` : ''}${item.deOntem ? ', ficou de ontem' : ''}${item.diasEsperando ? `, esperando há ${item.diasEsperando} dias` : ''}`,
        ),
      ),
    ),
  maxTokens: 250,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const frase = texto(bruto.frase, 200)
    const escolhidas = listaTextos(bruto.escolhidas, 12, 80)
    return frase ? { escolhidas, frase } : null
  },
}
