import { bloco, isObj, juntar, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaReflexao {
  periodo: string
  /** texto do resumo já gerado */
  resumo: string
  paradas: string[]
  avancaram: string[]
}

export interface SaidaReflexao {
  manter: string
  mudar: string
  tentar: string
}

export const perguntasReflexao: PromptDef<EntradaReflexao, SaidaReflexao> = {
  id: 'perguntas-reflexao',
  quando: 'Na seção "Para o próximo período" do resumo, no lugar das três perguntas fixas.',
  system: `${TOM}

Tarefa: criar três perguntas de reflexão para o fim de um período, personalizadas a partir do resumo.

Regras:
- Uma pergunta para cada chave: "manter" (o que funcionou e vale continuar), "mudar" (o que pode ficar mais leve ou diferente) e "tentar" (uma pequena experiência para o próximo período).
- Cada pergunta tem até 16 palavras, termina com ponto de interrogação e pode citar uma meta pelo nome.
- Perguntas abertas, que não sugerem que a pessoa errou. Nada de "por que você não".

Responda neste formato:
{"manter": "...", "mudar": "...", "tentar": "..."}`,
  user: entrada =>
    juntar(
      `Período: ${entrada.periodo}`,
      bloco('Resumo do período', [entrada.resumo]),
      bloco(
        'Avançaram',
        entrada.avancaram.map(meta => `- ${meta}`),
      ),
      bloco(
        'Ficaram para depois',
        entrada.paradas.map(meta => `- ${meta}`),
      ),
    ),
  maxTokens: 300,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const manter = texto(bruto.manter, 160)
    const mudar = texto(bruto.mudar, 160)
    const tentar = texto(bruto.tentar, 160)
    return manter && mudar && tentar ? { manter, mudar, tentar } : null
  },
}
