'use client'

import { useEffect, useRef } from 'react'
import { askAI } from '@/apis/ai/client'
import { periodInput } from '@/apis/ai/inputs'
import { useStore } from '@/shared/store'
import type { Summary } from '@/domain/types'

const PROMPT = { monthly: 'resumo-mensal', quarterly: 'resumo-trimestral' } as const

/** Pede à IA o texto de um resumo. Devolve os campos para atualizar, ou nulo se não deu. */
export async function writeSummary(summary: Summary, previous?: { titulo: string; texto: string }): Promise<Partial<Summary> | null> {
  try {
    const entrada = periodInput(useStore.getState(), summary, previous)
    const result = await askAI(PROMPT[summary.kind], entrada)
    return { title: result.titulo, narrative: result.texto, usedAI: true, aiStatus: undefined, edited: false }
  } catch (error) {
    console.warn('[resumo] IA indisponível:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Fica no AppShell: quando um resumo novo nasce esperando a IA, pede o texto em segundo plano.
 * Se a IA falhar, o resumo fica com a versão só com números, marcada "sem IA".
 */
export function useSummaryAI() {
  const summaries = useStore(state => state.summaries)
  const updateSummary = useStore(state => state.updateSummary)
  const asked = useRef(new Set<string>())

  useEffect(() => {
    for (const summary of summaries) {
      if (summary.aiStatus !== 'pending' || asked.current.has(summary.id)) continue
      asked.current.add(summary.id)
      void writeSummary(summary).then(patch => {
        // se a pessoa editou o texto enquanto esperava, a edição dela vale
        const current = useStore.getState().summaries.find(item => item.id === summary.id)
        if (!current || current.edited) return
        updateSummary(summary.id, patch ?? { aiStatus: undefined })
      })
    }
  }, [summaries, updateSummary])
}
