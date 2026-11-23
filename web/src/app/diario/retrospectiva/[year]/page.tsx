'use client'

import { Pin, PinOff, Play } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Missing, TopBar } from '@/components/app-shell'
import { BackButton } from '@/components/common'
import { Illustration } from '@/components/illustration'
import { useRetroCards } from '@/components/retro'
import { Button, buttonVariants } from '@/components/ui/button'
import { useStore } from '@/shared/store'

/** A retrospectiva guardada, como uma página simples de leitura. */
export default function RetroReadPage() {
  const params = useParams<{ year: string }>()
  const year = Number(params.year)
  const cards = useRetroCards(year)
  const retro = useStore(state => state.retros[year])
  const updateRetro = useStore(state => state.updateRetro)

  if (!cards || !retro)
    return <Missing title="Retrospectiva não encontrada" description="Ela fica disponível em dezembro." href="/diario?resumos" action="Ver resumos" />

  const [cover, ...rest] = cards

  return (
    <div className="pb-10">
      <TopBar title="Retrospectiva" back={<BackButton href="/diario?resumos" label="Voltar para Resumos" />} />
      <div className="px-5">
        <div className="flex justify-center">
          <Illustration name="year-retro" height={140} level="core" />
        </div>
        <p className="mt-2 text-[12px]">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium">Anual</span>
        </p>
        <h2 className="voice mt-2 text-[26px] leading-tight font-medium">{cover.title}</h2>
        <p className="voice mt-1 text-[16px]">{cover.lead}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/retrospectiva/${year}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Play size={16} strokeWidth={1.75} aria-hidden />
            Ver como história
          </Link>
          <Button variant="outline" size="sm" aria-pressed={retro.pinned} onClick={() => updateRetro(year, { pinned: !retro.pinned })}>
            {retro.pinned ? <PinOff size={16} strokeWidth={1.75} aria-hidden /> : <Pin size={16} strokeWidth={1.75} aria-hidden />}
            {retro.pinned ? 'Desafixar' : 'Fixar'}
          </Button>
        </div>

        {rest.map(card => (
          <section key={card.key} className="mt-6 border-t-[0.5px] border-line pt-5">
            <h3 className="voice text-[19px] leading-snug font-medium">{card.title}</h3>
            {card.lead && <p className="voice mt-1 text-[15px] leading-[1.7]">{card.lead}</p>}
            {card.body && <div className="mt-3">{card.body}</div>}
          </section>
        ))}
      </div>
    </div>
  )
}
