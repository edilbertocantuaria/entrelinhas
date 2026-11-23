'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Missing } from '@/components/app-shell'
import { Illustration } from '@/components/illustration'
import { useRetroCards } from '@/components/retro'
import { useStore } from '@/shared/store'
import { cn } from '@/shared/utils'

/** Retrospectiva anual em formato de história: deslize, toque nas laterais ou use as setas. */
export default function RetroStoryPage() {
  const params = useParams<{ year: string }>()
  const year = Number(params.year)
  const router = useRouter()
  const cards = useRetroCards(year)
  const updateRetro = useStore(state => state.updateRetro)
  const [index, setIndex] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const total = cards?.length ?? 0

  const go = useCallback((delta: number) => setIndex(current => Math.max(0, Math.min(total - 1, current + delta))), [total])

  // Abrir a história dispensa o aviso em Hoje
  useEffect(() => {
    updateRetro(year, { banner: false })
  }, [year, updateRetro])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('textarea, input')) return
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'Escape') router.push('/diario?resumos')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, router])

  if (!cards) return <Missing title="Retrospectiva não encontrada" description="Ela fica disponível em dezembro." href="/diario?resumos" action="Ver resumos" />

  const card = cards[index]

  const onTap = (event: MouseEvent<HTMLDivElement>) => {
    if (swiped.current) return void (swiped.current = false)
    if ((event.target as HTMLElement).closest('button, a, textarea, input, .recharts-wrapper')) return
    const box = event.currentTarget.getBoundingClientRect()
    go(event.clientX - box.left < box.width / 3 ? -1 : 1)
  }

  return (
    <div className="flex h-full flex-col bg-primary-soft">
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="flex flex-1 gap-1" role="progressbar" aria-label="Progresso da retrospectiva" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
          {cards.map((item, position) => (
            <span key={item.key} className={cn('h-1 flex-1 rounded-full', position <= index ? 'bg-primary' : 'bg-surface')} />
          ))}
        </div>
        <button type="button" className="icon-btn text-ink" aria-label="Fechar retrospectiva" onClick={() => router.push('/diario?resumos')}>
          <X size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 [scrollbar-width:none]"
        onClick={onTap}
        onTouchStart={event => (touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY })}
        onTouchEnd={event => {
          if (!touch.current) return
          const dx = event.changedTouches[0].clientX - touch.current.x
          const dy = event.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped.current = true
            go(dx < 0 ? 1 : -1)
          }
        }}
      >
        <article key={card.key} className="fade-in flex min-h-full flex-col justify-center py-6" aria-live="polite">
          {card.art && (
            <div className="mb-4 flex justify-center">
              <Illustration name={card.art} height={card.body ? 120 : 190} level="core" decorative={card.key !== 'capa'} />
            </div>
          )}
          <h1 className={cn('voice leading-tight font-medium', card.body ? 'text-[24px]' : 'text-center text-[30px]')}>{card.title}</h1>
          {card.lead && <p className={cn('voice mt-2 text-[16px] leading-[1.7]', !card.body && 'text-center')}>{card.lead}</p>}
          {card.body && <div className="mt-5">{card.body}</div>}
        </article>
      </div>

      <div className="flex items-center justify-between px-3 pb-4">
        <button type="button" className="icon-btn text-ink disabled:opacity-30" aria-label="Cartão anterior" disabled={index === 0} onClick={() => go(-1)}>
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <p className="text-[12px] text-ink/80 tabular-nums">
          {index + 1} de {total}
        </p>
        <button type="button" className="icon-btn text-ink disabled:opacity-30" aria-label="Próximo cartão" disabled={index === total - 1} onClick={() => go(1)}>
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
