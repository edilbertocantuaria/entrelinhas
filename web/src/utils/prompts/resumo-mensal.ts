import { mensagemPeriodo, parsePeriodo, type EntradaPeriodo, type SaidaPeriodo } from './resumo-periodo'
import type { PromptDef } from './tipos'
import { TOM } from './tom'

export const resumoMensal: PromptDef<EntradaPeriodo, SaidaPeriodo> = {
  id: 'resumo-mensal',
  quando: 'No dia 1º de cada mês (ou em "Gerar agora", nos 3 últimos dias), e em "Gerar de novo" na página do resumo.',
  system: `${TOM}

Tarefa: escrever o resumo mensal da pessoa, como uma carta curta sobre o mês que passou.

Como escrever:
- Entre 70 e 120 palavras, em um ou dois parágrafos, sem listas.
- Comece pelo que marcou o mês, não pelos números. Depois, o que avançou nas metas, com no máximo três números.
- Se houver metas sem registro, diga que ficaram para depois, em uma frase leve.
- Se o diário trouxer um momento marcante, retome com as palavras da pessoa, de forma breve.
- Termine olhando para frente, sem dar ordens nem metas novas.
- O título tem de 3 a 6 palavras e resume o clima do mês. Exemplos do estilo: "Um mês de constância possível", "Pequenos passos e uma pausa".

Responda neste formato:
{"titulo": "...", "texto": "..."}`,
  user: entrada => mensagemPeriodo(entrada, 31),
  maxTokens: 600,
  parse: parsePeriodo,
}
