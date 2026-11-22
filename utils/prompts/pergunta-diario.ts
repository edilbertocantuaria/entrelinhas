import { bloco, isObj, juntar, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaPerguntaDiario {
  /** "segunda-feira, 16 de novembro" */
  dia: string
  feitas: string[]
  dispensadas: string[]
  naoFeitas: string[]
  humor?: number
  /** últimas entradas, para não repetir assunto */
  ultimasEntradas?: string[]
}

export interface SaidaPerguntaDiario {
  pergunta: string
}

export const perguntaDiario: PromptDef<EntradaPerguntaDiario, SaidaPerguntaDiario> = {
  id: 'pergunta-diario',
  quando: 'No Fechamento do dia, como sugestão de por onde começar a escrever (texto de apoio do campo do diário).',
  system: `${TOM}

Tarefa: sugerir uma pergunta para a pessoa começar a escrever no diário ao fim do dia.

Regras:
- Uma pergunta só, com até 16 palavras, terminando com ponto de interrogação.
- Ligue a pergunta a algo concreto do dia (uma tarefa feita, uma pausa, o humor), sem cobrar o que não foi feito.
- Se o humor estiver baixo, a pergunta é acolhedora e simples.
- Não repita o assunto das últimas entradas.

Responda neste formato:
{"pergunta": "..."}`,
  user: entrada =>
    juntar(
      `Dia: ${entrada.dia}`,
      entrada.humor ? `Humor: ${entrada.humor} de 5` : '',
      bloco('Feitas', entrada.feitas.map(item => `- ${item}`)),
      bloco('Dispensadas', entrada.dispensadas.map(item => `- ${item}`)),
      bloco('Não feitas', entrada.naoFeitas.map(item => `- ${item}`)),
      bloco('Últimas entradas do diário', (entrada.ultimasEntradas ?? []).slice(-3).map(item => `- ${item.slice(0, 200)}`)),
    ),
  maxTokens: 120,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const pergunta = texto(bruto.pergunta, 160)
    return pergunta ? { pergunta } : null
  },
}
