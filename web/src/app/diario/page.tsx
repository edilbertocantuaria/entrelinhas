'use client'

import { BookOpen, ChevronRight, Mail, PenLine, Pin, Search, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { EmptyState, GoalChip, MoodBadge, MoodPicker } from '@/components/common'
import { Illustration, type IllustrationName } from '@/components/illustration'
import { Button, buttonVariants } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { fmt, longDay } from '@/shared/format'
import { useStore } from '@/shared/store'
import { inLastDaysOfMonth, KIND_LABEL, monthRange, periodLabel } from '@/domain/summaries'
import { useClock } from '@/shared/time'
import type { JournalEntry, SummaryKind } from '@/domain/types'
import { cn } from '@/shared/utils'

type View = 'entries' | 'summaries'

const THUMB: Record<SummaryKind, IllustrationName> = { monthly: 'summary-monthly', quarterly: 'summary-quarterly', annual: 'summary-annual' }

export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalView />
    </Suspense>
  )
}

/** "/diario?resumos" abre direto na aba Resumos (ex.: "Voltar para Resumos" no resumo). */
function JournalView() {
  const { today } = useClock()
  const params = useSearchParams()
  const [view, setView] = useState<View>(() => (params.has('resumos') ? 'summaries' : 'entries'))
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="flex min-h-full flex-col px-5 pt-6 pb-8">
      <header className="flex items-center gap-2">
        <h1 className="flex-1 text-[22px] font-medium">Diário</h1>
        <Link href="/revisao" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Revisão
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      </header>

      <Segmented
        className="mt-4"
        label="Ver"
        value={view}
        onChange={setView}
        options={[
          { value: 'entries', label: 'Entradas' },
          { value: 'summaries', label: 'Resumos' },
        ]}
      />

      {view === 'entries' ? <Entries onEdit={setEditing} today={today} /> : <Summaries today={today} />}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? longDay(editing) : ''}>
        {editing && <EntryForm key={editing} date={editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </div>
  )
}

function Entries({ onEdit, today }: { onEdit: (date: string) => void; today: string }) {
  const journal = useStore(state => state.journal)
  const goals = useStore(state => state.goals)
  const [query, setQuery] = useState('')

  const entries = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    const titles = new Map(goals.map(goal => [goal.id, goal.title.toLocaleLowerCase('pt-BR')]))
    return [...journal]
      .filter(entry => entry.text.trim() || entry.mood !== undefined)
      .filter(entry => !term || entry.text.toLocaleLowerCase('pt-BR').includes(term) || entry.goalIds.some(id => titles.get(id)?.includes(term)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [journal, goals, query])

  if (!journal.some(entry => entry.text.trim()))
    return (
      <EmptyState
        className="flex-1 justify-center"
        illustration="journal-empty"
        icon={BookOpen}
        title="Seu diário está em branco"
        description="Escreva como foi o dia, do seu jeito."
        action={<Button onClick={() => onEdit(today)}>Escrever agora</Button>}
      />
    )

  return (
    <>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} strokeWidth={1.75} aria-hidden className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input type="search" className="field" style={{ paddingLeft: 42 }} aria-label="Buscar no diário" placeholder="Buscar no diário" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <Button variant="outline" size="icon" className="size-12" aria-label="Escrever a entrada de hoje" onClick={() => onEdit(today)}>
          <PenLine size={20} strokeWidth={1.75} />
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-8 text-center text-muted">Nenhuma entrada com esse termo.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {entries.map(entry => (
            <li key={entry.id}>
              <button type="button" onClick={() => onEdit(entry.date)} className="card block w-full p-4 text-left">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="voice text-[15px] font-medium">{longDay(entry.date)}</span>
                  <MoodBadge mood={entry.mood} />
                </span>
                {entry.text.trim() && <span className="voice mt-1.5 line-clamp-4 block text-[14px] leading-[1.7]">{entry.text}</span>}
                {entry.goalIds.length > 0 && (
                  <span className="mt-2.5 flex flex-wrap gap-1.5">
                    {entry.goalIds.map(id => (
                      <GoalChip key={id} goalId={id} />
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function EntryForm({ date, onClose }: { date: string; onClose: () => void }) {
  const entry = useStore(state => state.journal.find(item => item.date === date))
  const saveJournal = useStore(state => state.saveJournal)
  const deleteJournal = useStore(state => state.deleteJournal)
  const [text, setText] = useState(entry?.text ?? '')
  const [mood, setMood] = useState<number | undefined>(entry?.mood)

  return (
    <div className="flex flex-col gap-3">
      <MoodPicker value={mood} onChange={setMood} />
      <textarea autoFocus aria-label="Texto da entrada" className="field voice min-h-48" placeholder="Como foi o dia, do seu jeito." value={text} onChange={event => setText(event.target.value)} />
      <div className="flex gap-2">
        {entry && (
          <Button
            variant="quiet"
            onClick={() => {
              deleteJournal(entry.id)
              onClose()
            }}
          >
            Excluir
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={() => {
            saveJournal(date, { text, mood })
            onClose()
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  )
}

interface Card {
  key: string
  kind: SummaryKind
  href: string
  title: string
  text: string
  period: string
  sort: string
  pinned: boolean
}

function Summaries({ today }: { today: string }) {
  const router = useRouter()
  const summaries = useStore(state => state.summaries)
  const retros = useStore(state => state.retros)
  const useAI = useStore(state => state.settings.useAI)
  const generateSummary = useStore(state => state.generateSummary)
  const ensureRetro = useStore(state => state.ensureRetro)
  const [generating, setGenerating] = useState(false)

  const year = Number(today.slice(0, 4))
  const month = monthRange(today)
  const canGenerateMonth = inLastDaysOfMonth(today) && !summaries.some(summary => summary.id === `s-${today.slice(0, 7)}`)
  const canGenerateRetro = today.slice(5, 7) === '12'

  const cards: Card[] = [
    ...summaries.map(summary => ({
      key: summary.id,
      kind: summary.kind as SummaryKind,
      href: `/diario/resumo/${summary.id}`,
      title: summary.title,
      text: summary.narrative,
      period: periodLabel(summary),
      sort: summary.end,
      pinned: summary.pinned,
    })),
    ...Object.values(retros)
      .filter(retro => retro.saved)
      .map(retro => ({
        key: `retro-${retro.year}`,
        kind: 'annual' as const,
        href: `/diario/retrospectiva/${retro.year}`,
        title: `Seu ${retro.year}`,
        text: retro.letter,
        period: String(retro.year),
        sort: `${retro.year}-12-31`,
        pinned: retro.pinned,
      })),
  ].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.sort.localeCompare(a.sort))

  const generateMonth = () => {
    setGenerating(true)
    window.setTimeout(() => {
      const id = generateSummary('monthly', month.start, month.end, today)
      router.push(`/diario/resumo/${id}`)
    }, 1800)
  }

  if (generating)
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center" role="status">
        <Illustration name="generating" height={120} level="core" decorative />
        <p className="mt-4 text-[15px] font-medium">Preparando seu resumo</p>
        <p className="mt-1 text-[13px] text-muted">{useAI ? 'Lendo o diário e os registros do mês.' : 'Juntando os números do mês, sem IA.'}</p>
      </div>
    )

  return (
    <div className="mt-4 flex flex-1 flex-col gap-3">
      {canGenerateMonth && (
        <div className="card flex items-center gap-3 p-4">
          <Sparkles size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-primary" />
          <p className="flex-1 text-[14px]">O resumo de {fmt(today, 'MMMM')} já pode ser gerado.</p>
          <Button variant="outline" size="sm" onClick={generateMonth}>
            Gerar agora
          </Button>
        </div>
      )}
      {canGenerateRetro && (
        <div className="card flex items-center gap-3 p-4">
          <Mail size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-primary" />
          <p className="flex-1 text-[14px]">Retrospectiva de {year}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              ensureRetro(year, today)
              router.push(`/retrospectiva/${year}`)
            }}
          >
            Gerar agora
          </Button>
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyState className="flex-1 justify-center" illustration="summary-ready" icon={Mail} title="Nenhum resumo ainda" description="O primeiro aparece quando o mês terminar." />
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map(card => (
            <li key={card.key}>
              <Link href={card.href} className="flex gap-3 rounded-card bg-primary-soft p-4">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[12px]">
                    <span className={cn('rounded-full bg-surface px-2 py-0.5 font-medium')}>{KIND_LABEL[card.kind]}</span>
                    <span className="text-ink/80">{card.period}</span>
                    {card.pinned && <Pin size={14} strokeWidth={1.75} aria-label="Fixado" className="text-primary" />}
                  </span>
                  <span className="voice mt-2 block text-[16px] leading-snug font-medium">{card.title}</span>
                  <span className="voice mt-1 line-clamp-2 block text-[14px] leading-[1.6]">{card.text}</span>
                </span>
                <Illustration name={THUMB[card.kind]} height={56} decorative />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
