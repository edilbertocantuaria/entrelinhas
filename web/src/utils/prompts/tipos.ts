/**
 * Formato comum dos prompts do app.
 * Todo prompt pede a resposta em JSON, para o app conseguir validar antes de mostrar.
 */
export interface PromptDef<Entrada, Saida> {
  /** identificador usado na rota /api/ia */
  id: string
  /** em que momento do app este prompt é usado */
  quando: string
  /** instruções fixas (tom, regras, formato da resposta) */
  system: string
  /** monta a mensagem com os dados do momento */
  user: (entrada: Entrada) => string
  /** limite de tokens da resposta */
  maxTokens: number
  /** confere o JSON devolvido; nulo quando não serve */
  parse: (bruto: unknown) => Saida | null
}

// ---------- Ajudantes de validação ----------

export const isObj = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/** Texto não vazio, sem espaços sobrando e com limite de tamanho. */
export const texto = (valor: unknown, max = 2000): string | null => (typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, max) : null)

export const listaTextos = (valor: unknown, maxItens: number, maxTexto = 300): string[] =>
  Array.isArray(valor)
    ? valor
        .map(item => texto(item, maxTexto))
        .filter((item): item is string => !!item)
        .slice(0, maxItens)
    : []

// ---------- Ajudantes para montar a mensagem ----------

/** Corta textos longos do diário para não mandar mais do que o necessário. */
export const cortar = (valor: string, max: number) => (valor.length > max ? `${valor.slice(0, max).trimEnd()}…` : valor)

/** Bloco com título, pulado quando está vazio. */
export const bloco = (titulo: string, linhas: (string | false | null | undefined)[]) => {
  const corpo = linhas.filter(Boolean)
  return corpo.length ? `## ${titulo}\n${corpo.join('\n')}` : ''
}

export const juntar = (...blocos: string[]) => blocos.filter(Boolean).join('\n\n')
