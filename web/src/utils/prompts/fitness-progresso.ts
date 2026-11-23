import { bloco, isObj, juntar, texto, type PromptDef } from './tipos'
import { TOM } from './tom'

export interface EntradaFitness {
  /** "últimas 8 semanas" */
  periodo: string
  treinosPorSemana: { semana: string; treinos: number; minutos: number }[]
  tipos: { tipo: string; vezes: number }[]
  cargas: { exercicio: string; de: number; para: number; treinos: number }[]
  peso?: { de: number; para: number; medicoes: number }
}

export interface SaidaFitness {
  texto: string
}

export const fitnessProgresso: PromptDef<EntradaFitness, SaidaFitness> = {
  id: 'fitness-progresso',
  quando: 'No módulo Fitness, num cartão "Como estão os treinos", acima dos gráficos.',
  system: `${TOM}

Tarefa: descrever o movimento dos treinos no período, de forma breve e encorajadora sem exagero.

Regras:
- De 40 a 80 palavras, um parágrafo.
- Fale de constância (semanas com treino), variedade de atividades e evolução de carga, com no máximo três números.
- Peso: só descreva a mudança em números, sem dizer se é bom ou ruim e sem falar de corpo, aparência ou dieta.
- Não sugira cargas, séries, dietas, suplementos nem treinos. Não fale de dor ou lesão.
- Semanas sem treino são pausa, não falha.

Responda neste formato:
{"texto": "..."}`,
  user: entrada =>
    juntar(
      `Período: ${entrada.periodo}`,
      bloco(
        'Treinos por semana',
        entrada.treinosPorSemana.map(item => `- semana de ${item.semana}: ${item.treinos} treinos, ${item.minutos} min`),
      ),
      bloco(
        'Tipos de treino',
        entrada.tipos.map(item => `- ${item.tipo}: ${item.vezes} vezes`),
      ),
      bloco(
        'Cargas',
        entrada.cargas.slice(0, 8).map(item => `- ${item.exercicio}: de ${item.de} kg para ${item.para} kg em ${item.treinos} treinos`),
      ),
      entrada.peso ? bloco('Peso', [`- de ${entrada.peso.de} kg para ${entrada.peso.para} kg em ${entrada.peso.medicoes} medições`]) : '',
    ),
  maxTokens: 300,
  parse: bruto => {
    if (!isObj(bruto)) return null
    const corpo = texto(bruto.texto, 700)
    return corpo ? { texto: corpo } : null
  },
}
