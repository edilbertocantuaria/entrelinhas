'use client'

import { Check, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { MAX_ACTIVE_AREAS } from '@/domain/areas'
import { useStore } from '@/shared/store'
import { cn } from '@/shared/utils'
import { AreaEditor } from './area-editor'
import { AreaIcon } from './common'
import { Illustration, type IllustrationName } from './illustration'
import { Button } from './ui/button'

const SLIDES: { art: IllustrationName; title: string; text: string }[] = [
  { art: 'onboarding-goals', title: 'Metas que cabem no seu ano', text: 'Defina o que importa, escolha como medir e acompanhe sem pressa.' },
  { art: 'onboarding-routine', title: 'Um dia de cada vez', text: 'Poucas tarefas por dia, ligadas às suas metas. O que não couber espera em Depois.' },
  { art: 'onboarding-journal', title: 'Um diário que vira resumo', text: 'Escreva do seu jeito. Todo mês, um resumo gentil do que você viveu.' },
]

/** Primeira abertura: 3 telas de boas-vindas e a escolha das áreas da vida. */
export function Onboarding() {
  const [step, setStep] = useState(0)
  const areas = useStore(state => state.areas)
  const finish = useStore(state => state.finishOnboarding)
  const [off, setOff] = useState<Set<string>>(new Set())
  const [editor, setEditor] = useState<{ open: boolean; id?: string }>({ open: false })

  const ordered = [...areas].sort((a, b) => a.order - b.order)
  const chosen = ordered.filter(area => !off.has(area.id))
  const toggle = (id: string) =>
    setOff(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (step < SLIDES.length) {
    const slide = SLIDES[step]
    return (
      <div className="flex flex-1 flex-col px-6 pt-4 pb-6">
        <div className="flex h-11 justify-end">
          <Button variant="quiet" size="sm" onClick={() => setStep(SLIDES.length)}>
            Pular
          </Button>
        </div>
        <div className="fade-in flex flex-1 flex-col items-center justify-center text-center" key={step}>
          <Illustration name={slide.art} height={220} level="core" className="w-full" />
          <h1 className="voice mt-8 text-[22px] leading-snug font-medium">{slide.title}</h1>
          <p className="mt-2 max-w-[280px] text-[15px] text-muted">{slide.text}</p>
        </div>
        <div className="mb-5 flex justify-center gap-2" role="img" aria-label={`Passo ${step + 1} de ${SLIDES.length}`}>
          {SLIDES.map((_, index) => (
            <span key={index} className={cn('h-2 rounded-full transition-all', index === step ? 'w-6 bg-primary' : 'w-2 bg-primary-soft')} />
          ))}
        </div>
        <Button block onClick={() => setStep(step + 1)}>
          {step === SLIDES.length - 1 ? 'Começar' : 'Continuar'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroller px-5 pt-8">
        <h1 className="voice text-[22px] leading-snug font-medium">Suas áreas da vida</h1>
        <p className="mt-1 text-muted">As metas ficam agrupadas por área. Marque as que fazem sentido e ajuste como quiser.</p>
        <ul className="card mt-5 divide-y-[0.5px] divide-line">
          {ordered.map(area => {
            const on = !off.has(area.id)
            return (
              <li key={area.id} className="flex items-center gap-1 pr-1 pl-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(area.id)}
                  className="flex min-h-14 flex-1 items-center gap-3 rounded-ctl px-2 text-left"
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full border',
                      on ? 'border-primary bg-primary text-on-primary' : 'border-line',
                    )}
                  >
                    {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
                  </span>
                  <AreaIcon area={area} size={28} />
                  <span className={cn('flex-1 text-[15px]', !on && 'text-muted')}>{area.name}</span>
                </button>
                <button type="button" className="icon-btn" aria-label={`Editar ${area.name}`} onClick={() => setEditor({ open: true, id: area.id })}>
                  <Pencil size={18} strokeWidth={1.75} />
                </button>
              </li>
            )
          })}
        </ul>
        <Button variant="ghost" size="sm" className="mt-2" disabled={areas.length >= MAX_ACTIVE_AREAS} onClick={() => setEditor({ open: true })}>
          <Plus size={18} strokeWidth={1.75} aria-hidden />
          Nova área
        </Button>
      </div>
      <div className="px-5 pt-3 pb-6">
        {chosen.length === 0 && <p className="mb-2 text-center text-[12px] text-muted">Escolha pelo menos uma área.</p>}
        <Button block disabled={chosen.length === 0} onClick={() => finish(chosen.map(area => area.id))}>
          Começar
        </Button>
      </div>
      <AreaEditor open={editor.open} areaId={editor.id} onClose={() => setEditor(previous => ({ ...previous, open: false }))} />
    </div>
  )
}
