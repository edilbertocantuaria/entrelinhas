import { bloco, isObj, juntar, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

const TIPOS = ['frequency', 'sum', 'value', 'milestones', 'days'] as const
type TipoMedida = (typeof TIPOS)[number]

export interface EntradaMetaSmart {
  titulo: string
  descricao?: string
  area: string
  /** data final escolhida, "aaaa-mm-dd"; com marco, pode vir vazia (ou ser só estimativa) */
  prazo: string
  /** marco que encerra a meta ("passar no concurso"), quando ela vale até algo acontecer */
  ate?: string
  hoje: string
}

export interface SaidaMetaSmart {
  /** "Específica": a meta em uma frase clara */
  descricao: string
  /** "Mensurável": tipo de medida sugerido e por quê */
  medida: { tipo: TipoMedida; explicacao: string; sugestao: string }
  /** "Alcançável": uma pergunta para a pessoa pensar no ponto de partida */
  pontoDePartida: string
  /** "Relevante": uma pergunta para a pessoa escrever o porquê */
  porQue: string
  /** título curto da tarefa diária gerada pela meta */
  tarefa: string
}

export const metaSmart: PromptDef<EntradaMetaSmart, SaidaMetaSmart> = {
  id: 'meta-smart',
  quando: 'Na criação de uma meta (passo a passo SMART), num botão "Me ajude a detalhar" depois do título.',
  system: `${TOM}

Tarefa: ajudar a pessoa a transformar a ideia de uma meta numa meta SMART, sem decidir por ela.

Tipos de medida disponíveis no app:
- "frequency": um combinado que se repete a cada semana, mês, bimestre, trimestre ou ano, contando vezes, horas, ou dias e horas juntos (ex.: treinar de 3 a 4 vezes por semana; estudar 40 horas por mês; estudar 5 dias por semana, 2 horas por dia). Tem mínimo (o que deixa no ritmo) e máximo (o teto)
- "sum": soma até um alvo (ex.: guardar R$ 5.000,00)
- "value": um valor que muda de X para Y (ex.: peso de 85 kg para 78 kg)
- "milestones": etapas de um projeto (ex.: 5 etapas até entregar)
- "days": dias feitos ou horas dedicadas (ex.: estudar em 60 dias diferentes)

Prazo: a meta termina numa data ou num marco (vale até algo acontecer, como "passar no concurso"). Com marco e sem data, soma, valor, etapas e dias não têm como medir o ritmo: prefira frequência.

O que devolver:
- "descricao": a meta em uma frase específica, com o prazo ou o marco ("até passar no concurso"), em até 25 palavras. Datas por extenso.
- "medida": o tipo mais natural para essa meta, uma explicação de até 20 palavras e uma sugestão de valores realista, como texto curto (ex.: "3 a 4 vezes por semana", "5 dias por semana, 2 h por dia"). Prefira metas possíveis a metas grandes: o mínimo deve caber numa semana difícil.
- "pontoDePartida": uma pergunta curta sobre como as coisas estão hoje.
- "porQue": uma pergunta curta que ajude a pessoa a escrever por que isso importa.
- "tarefa": o título da tarefa que vai aparecer no dia, começando por um verbo, em até 5 palavras.

Responda neste formato:
{"descricao": "...", "medida": {"tipo": "frequency", "explicacao": "...", "sugestao": "..."}, "pontoDePartida": "...", "porQue": "...", "tarefa": "..."}`,
  user: entrada =>
    juntar(
      bloco('Meta', [
        `- título: ${entrada.titulo}`,
        entrada.descricao && `- descrição da pessoa: ${entrada.descricao}`,
        `- área da vida: ${entrada.area}`,
        entrada.ate ? `- vale até: ${entrada.ate}${entrada.prazo ? ` (data estimada: ${entrada.prazo})` : ' (sem data)'}` : `- prazo: ${entrada.prazo}`,
        `- hoje: ${entrada.hoje}`,
      ]),
    ),
  maxTokens: 500,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const medida = bruto.medida
    if (!isObj(medida)) return null
    const tipo = TIPOS.find(item => item === medida.tipo)
    const descricao = texto(bruto.descricao, 300)
    const explicacao = texto(medida.explicacao, 200)
    const sugestao = texto(medida.sugestao, 200)
    const pontoDePartida = texto(bruto.pontoDePartida, 200)
    const porQue = texto(bruto.porQue, 200)
    const tarefa = texto(bruto.tarefa, 60)
    if (!tipo || !descricao || !explicacao || !sugestao || !pontoDePartida || !porQue || !tarefa) return null
    return { descricao, medida: { tipo, explicacao, sugestao }, pontoDePartida, porQue, tarefa }
  },
}
