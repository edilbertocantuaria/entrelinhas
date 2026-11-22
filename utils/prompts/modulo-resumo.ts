import { bloco, cortar, isObj, juntar, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaModulo {
  modulo: string
  periodo: string
  /** uma linha por campo, ex.: "Páginas: 353 páginas no total", "Gostei: média 4,3 de 5" */
  numeros: string[]
  registros: number
  anotacoes: { data: string; campo: string; texto: string }[]
}

export interface SaidaModulo {
  texto: string
}

export const moduloResumo: PromptDef<EntradaModulo, SaidaModulo> = {
  id: 'modulo-resumo',
  quando: 'Nos módulos criados pela pessoa (Leitura, Sono, Gastos...), num cartão "Como foi o mês" no topo.',
  system: `${TOM}

Tarefa: resumir um módulo de registros pessoais no período. O módulo pode ser de qualquer assunto: leitura, sono, gastos, meditação, idiomas e outros.

Regras:
- De 35 a 70 palavras, um parágrafo.
- Use os números e as anotações para contar o que aconteceu, com no máximo três números.
- Em módulos de dinheiro, descreva sem julgar gastos. Em módulos de sono, alimentação ou saúde, não aconselhe.
- Se houver poucos registros, diga isso com leveza, sem cobrar.

Responda neste formato:
{"texto": "..."}`,
  user: entrada =>
    juntar(
      `Módulo: ${entrada.modulo}`,
      `Período: ${entrada.periodo} (${entrada.registros} registros)`,
      bloco('Números', entrada.numeros.map(linha => `- ${linha}`)),
      bloco('Anotações', entrada.anotacoes.slice(0, 30).map(item => `- ${item.data} · ${item.campo}: ${cortar(item.texto, 200)}`)),
    ),
  maxTokens: 250,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const corpo = texto(bruto.texto, 600)
    return corpo ? { texto: corpo } : null
  },
}
