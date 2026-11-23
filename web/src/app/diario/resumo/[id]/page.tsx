'use client'

import { Pencil, Pin, PinOff, RefreshCw, Share2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Missing, TopBar, useShell } from '@/components/app-shell'
import { AreaIcon, BackButton } from '@/components/common'
import { MoodChart } from '@/components/goal-visuals'
import { Illustration } from '@/components/illustration'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { areaColor } from '@/domain/areas'
import { num, shortDay } from '@/shared/format'
import { periodStats } from '@/domain/goals'
import { useStore } from '@/shared/store'
import { writeSummary } from '@/components/summary-ai'
import { KIND_LABEL, periodLabel, REFLECTION_PROMPTS, regenerate } from '@/domain/summaries'
import { useClock } from '@/shared/time'

type Phase = 'ready' | 'loading' | 'offline'

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>()
  const { today } = useClock()
  const { toast } = useShell()
  const summary = useStore(state => state.summaries.find(item => item.id === id))
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const tasks = useStore(state => state.tasks)
  const journal = useStore(state => state.journal)
  const areas = useStore(state => state.areas)
  const useAI = useStore(state => state.settings.useAI)
  const hidePercent = useStore(state => state.settings.hidePercent)
  const updateSummary = useStore(state => state.updateSummary)

  const [phase, setPhase] = useState<Phase>('ready')
  const [draft, setDraft] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const stats = useMemo(
    () => (summary ? periodStats({ goals, logs, tasks, journal }, summary.start, summary.end) : null),
    [summary, goals, logs, tasks, journal],
  )

  useEffect(() => {
    if (summary && !summary.seen) updateSummary(summary.id, { seen: true })
  }, [summary, updateSummary])

  if (!summary || !stats) return <Missing title="Resumo não encontrado" description="Ele pode ter sido gerado de novo." href="/diario?resumos" action="Ver resumos" />

  const run = async () => {
    setConfirming(false)
    if (!useAI) {
      updateSummary(summary.id, regenerate({ goals, logs, tasks, journal }, summary, today))
      return toast('Texto refeito com os seus números')
    }
    if (!navigator.onLine) return setPhase('offline')
    setPhase('loading')
    const patch = await writeSummary(summary, { titulo: summary.title, texto: summary.narrative })
    if (patch) updateSummary(summary.id, { ...patch, variant: summary.variant + 1, generatedAt: today })
    else toast('Não deu para falar com a IA agora. O texto atual continua guardado.')
    setPhase('ready')
  }

  const writing = phase === 'loading' || summary.aiStatus === 'pending'

  const status = [
    `Gerado em ${shortDay(summary.generatedAt)}`,
    summary.edited ? 'editado por você' : null,
    summary.usedAI ? null : 'sem IA',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="pb-10">
      <TopBar title="Resumo" back={<BackButton href="/diario?resumos" label="Voltar para Resumos" />} />
      <div className="px-5">
        <div className="flex justify-center">
          <Illustration name="summary-ready" height={128} decorative />
        </div>
        <p className="mt-2 flex items-center gap-2 text-[12px]">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium">{KIND_LABEL[summary.kind]}</span>
          <span className="text-muted">{periodLabel(summary)}</span>
          {summary.pinned && <Pin size={14} strokeWidth={1.75} className="text-primary" aria-label="Fixado" />}
        </p>
        <h2 className="voice mt-2 text-[22px] leading-snug font-medium">{summary.title}</h2>

        {/* 1. Narrativa */}
        {writing ? (
          <div className="card mt-4 flex flex-col items-center p-6 text-center" role="status">
            <Illustration name="generating" height={96} level="core" decorative />
            <p className="mt-3 text-[15px] font-medium">{phase === 'loading' ? 'Escrevendo de novo' : 'Escrevendo o seu resumo'}</p>
            <p className="text-[13px] text-muted">Relendo o diário e os registros do período.</p>
          </div>
        ) : phase === 'offline' ? (
          <div className="card mt-4 flex flex-col items-center p-6 text-center" role="status">
            <Illustration name="offline" height={110} level="core" decorative />
            <p className="mt-3 text-[15px] font-medium">Sem conexão agora</p>
            <p className="text-[13px] text-muted">Dá para gerar de novo quando a internet voltar. O texto atual continua guardado.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setPhase('ready')}>
              Voltar ao resumo
            </Button>
          </div>
        ) : draft !== null ? (
          <div className="mt-4">
            <textarea autoFocus aria-label="Texto do resumo" className="field voice min-h-56 text-[15px]" value={draft} onChange={event => setDraft(event.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  updateSummary(summary.id, { narrative: draft.trim(), edited: true })
                  setDraft(null)
                  toast('Texto salvo')
                }}
              >
                Salvar texto
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="voice mt-3 text-[16px] leading-[1.8]">{summary.narrative}</p>
            <p className="mt-2 text-[12px] text-muted">{status}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setDraft(summary.narrative)}>
                <Pencil size={16} strokeWidth={1.75} aria-hidden />
                Editar texto
              </Button>
              <Button variant="outline" size="sm" onClick={() => (summary.edited ? setConfirming(true) : run())}>
                <RefreshCw size={16} strokeWidth={1.75} aria-hidden />
                Gerar de novo
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast('Compartilhar chega em breve.')}>
                <Share2 size={16} strokeWidth={1.75} aria-hidden />
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" aria-pressed={summary.pinned} onClick={() => updateSummary(summary.id, { pinned: !summary.pinned })}>
                {summary.pinned ? <PinOff size={16} strokeWidth={1.75} aria-hidden /> : <Pin size={16} strokeWidth={1.75} aria-hidden />}
                {summary.pinned ? 'Desafixar' : 'Fixar'}
              </Button>
            </div>
          </>
        )}

        {/* 2. O que avançou */}
        <Section title="O que avançou">
          {stats.advanced.length === 0 ? (
            <p className="text-[14px] text-muted">Foi um período mais quieto para as metas.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {stats.advanced.map(({ goal, text, ratio }) => {
                const area = areas.find(item => item.id === goal.areaId)
                return (
                  <li key={goal.id}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <AreaIcon area={area} />
                      <span className="min-w-0 flex-1 truncate text-[14px]">{goal.title}</span>
                      <span className="shrink-0 text-[12px] text-muted">
                        {text}
                        {!hidePercent && goal.metric.type !== 'frequency' && ` · ${Math.round(ratio * 100)}%`}
                      </span>
                    </div>
                    <ProgressBar value={ratio} color={areaColor(area?.color)} label={goal.title} />
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {/* 3. O que ficou parado */}
        <Section title="O que ficou parado">
          {stats.stalled.length === 0 ? (
            <p className="text-[14px] text-muted">Todas as metas tiveram algum movimento.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.stalled.map(goal => (
                <li key={goal.id} className="flex items-center gap-2 text-[14px]">
                  <AreaIcon area={areas.find(item => item.id === goal.areaId)} />
                  <span>
                    {goal.title} <span className="text-muted">não avançou neste período. Ficou para depois.</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 4. Humor */}
        <Section title="Humor do período">
          <MoodChart data={stats.moods} />
          {stats.moodAverage !== null && (
            <p className="mt-1 text-[12px] text-muted">
              Média de {num(stats.moodAverage, 1)} em 5, em {stats.moods.length} registros.
            </p>
          )}
        </Section>

        {/* 5. Trechos */}
        <Section title="Trechos que marcaram">
          {stats.quotes.length === 0 ? (
            <p className="text-[14px] text-muted">Sem entradas de diário neste período.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.quotes.map(quote => (
                <li key={quote.date} className="border-l-2 border-primary pl-3">
                  <blockquote className="voice text-[15px] leading-[1.7]">“{quote.text}”</blockquote>
                  <p className="mt-1 text-[12px] text-muted">{shortDay(quote.date)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 6. Reflexão */}
        <Section title="Para o próximo período">
          <div className="flex flex-col gap-4">
            {REFLECTION_PROMPTS.map(prompt => (
              <label key={prompt.key} className="flex flex-col gap-1.5">
                <span className="voice text-[15px]">{prompt.label}</span>
                <textarea
                  className="field voice"
                  rows={2}
                  value={summary.reflections[prompt.key] ?? ''}
                  onChange={event => updateSummary(summary.id, { reflections: { ...summary.reflections, [prompt.key]: event.target.value } })}
                />
              </label>
            ))}
          </div>
        </Section>
      </div>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Gerar o texto de novo?" description="O novo texto substitui o que você editou.">
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={run}>
            Gerar de novo
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t-[0.5px] border-line pt-5">
      <h3 className="mb-3 text-[15px] font-medium">{title}</h3>
      {children}
    </section>
  )
}
