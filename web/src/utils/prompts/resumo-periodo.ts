import { bloco, cortar, isObj, juntar, texto } from './tipos'

/** Dados de um mês ou trimestre, montados no app a partir do diário, das metas e das tarefas. */
export interface EntradaPeriodo {
  /** "outubro de 2026" ou "3º trimestre de 2026" */
  periodo: string
  diario: { data: string; humor?: number; texto: string }[]
  humorMedio: number | null
  tarefas: { feitas: number; dispensadas: number; naoFeitas: number }
  avancaram: { meta: string; area?: string; progresso: string; ritmo?: string }[]
  paradas: { meta: string; area?: string }[]
  /** resumo curto de cada módulo no período, ex.: "Leitura: 11 registros, 353 páginas" */
  modulos?: string[]
  /** texto atual, quando a pessoa pede "Gerar de novo": a nova versão deve soar diferente */
  anterior?: { titulo: string; texto: string }
}

export interface SaidaPeriodo {
  titulo: string
  texto: string
}

const HUMOR = ['', 'difícil', 'nublado', 'neutro', 'bom', 'ótimo']

/** Parte comum da mensagem dos resumos mensal e trimestral. */
export function mensagemPeriodo(entrada: EntradaPeriodo, limiteDiario: number) {
  const diario = entrada.diario.slice(-limiteDiario)
  return juntar(
    `Período: ${entrada.periodo}`,
    bloco(
      'Metas que avançaram',
      entrada.avancaram.map(item => `- ${item.meta}${item.area ? ` (${item.area})` : ''}: ${item.progresso}${item.ritmo ? `, ${item.ritmo}` : ''}`),
    ),
    bloco(
      'Metas sem registro no período',
      entrada.paradas.map(item => `- ${item.meta}${item.area ? ` (${item.area})` : ''}`),
    ),
    bloco('Tarefas', [
      `- feitas: ${entrada.tarefas.feitas}`,
      `- dispensadas (não contam contra o ritmo): ${entrada.tarefas.dispensadas}`,
      `- não feitas: ${entrada.tarefas.naoFeitas}`,
    ]),
    bloco('Humor', [entrada.humorMedio !== null ? `- média: ${entrada.humorMedio.toFixed(1).replace('.', ',')} de 5` : '- sem registros de humor']),
    bloco(
      'Módulos',
      (entrada.modulos ?? []).map(linha => `- ${linha}`),
    ),
    bloco(
      `Diário (${diario.length} de ${entrada.diario.length} entradas)`,
      diario.map(item => `- ${item.data}${item.humor ? ` [humor ${HUMOR[item.humor] ?? item.humor}]` : ''}: ${cortar(item.texto.replace(/\s+/g, ' '), 500)}`),
    ),
    entrada.anterior
      ? bloco('Versão anterior (escreva uma nova, com outra abertura, outra ordem e outras palavras; mantenha os fatos)', [
          `Título: ${entrada.anterior.titulo}`,
          `Texto: ${entrada.anterior.texto}`,
        ])
      : '',
  )
}

export function parsePeriodo(bruto: unknown): SaidaPeriodo | null {
  if (!isObj(bruto)) return null
  const limpo = texto(bruto.titulo, 60)?.replace(/[.!]+$/, '')
  // caixa de frase: primeira letra maiúscula
  const titulo = limpo && limpo.charAt(0).toLocaleUpperCase('pt-BR') + limpo.slice(1)
  const corpo = texto(bruto.texto, 1600)?.replace(/!/g, '.')
  return titulo && corpo ? { titulo, texto: corpo } : null
}
