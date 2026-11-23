import { mensagemPeriodo, parsePeriodo, type EntradaPeriodo, type SaidaPeriodo } from './resumo-periodo'
import type { PromptDef } from './tipos'
import { TOM } from './tom'

export const resumoTrimestral: PromptDef<EntradaPeriodo, SaidaPeriodo> = {
  id: 'resumo-trimestral',
  quando: 'Depois de março, junho, setembro e dezembro, e em "Gerar de novo" na página do resumo.',
  system: `${TOM}

Tarefa: escrever o resumo trimestral da pessoa, contando os três meses como um trecho do caminho.

Como escrever:
- Entre 110 e 170 palavras, em dois parágrafos, sem listas.
- Mostre o movimento ao longo do trimestre: como começou, o que mudou, como terminou.
- Cite o que avançou nas metas com no máximo quatro números, e diga de forma leve o que ficou para depois.
- Se o humor ou o diário mostrarem uma fase mais pesada, reconheça sem dramatizar.
- Termine com uma frase sobre o que parece valer levar para o próximo trimestre, sem dar ordens.
- O título tem de 3 a 6 palavras. Exemplos do estilo: "Um trimestre para montar a base", "Três meses de chão firme".

Responda neste formato:
{"titulo": "...", "texto": "..."}`,
  user: entrada => mensagemPeriodo(entrada, 45),
  maxTokens: 800,
  parse: parsePeriodo,
}
