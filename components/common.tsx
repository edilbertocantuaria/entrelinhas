'use client'

import { ChevronLeft, Cloud, CloudRain, CloudSun, Sparkles, Sun, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { areaColor, areaIcon } from '@/lib/areas'
import { PACE_LABEL, type PaceStatus } from '@/lib/goals'
import { useStore } from '@/lib/store'
import type { Area } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Illustration, useIllustrations, type IllustrationName } from './illustration'

// ---------- Áreas ----------

/** Ícone da área (14px) num círculo tingido com a cor da área. */
export function AreaIcon({ area, size = 24 }: { area: Pick<Area, 'icon' | 'color'> | undefined; size?: number }) {
  const Icon = areaIcon(area?.icon)
  const color = areaColor(area?.color)
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 20%, var(--surface))` }}
    >
      <Icon size={Math.max(14, Math.round(size * 0.52))} strokeWidth={1.75} />
    </span>
  )
}

/** Chip da área: ícone + nome, sobre --primary-soft. */
export function AreaChip({ area, className }: { area: Pick<Area, 'icon' | 'color' | 'name'> | undefined; className?: string }) {
  if (!area) return null
  return (
    <span className={cn('inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-primary-soft pr-2.5 pl-0.5 text-[12px] text-ink', className)}>
      <AreaIcon area={area} />
      <span className="truncate">{area.name}</span>
    </span>
  )
}

export function useArea(areaId: string | undefined) {
  return useStore(state => state.areas.find(area => area.id === areaId))
}

/** Chip de meta numa tarefa ou entrada: ícone da área + título da meta. */
export function GoalChip({ goalId, className }: { goalId: string; className?: string }) {
  const goal = useStore(state => state.goals.find(item => item.id === goalId))
  const area = useArea(goal?.areaId)
  if (!goal) return null
  return <AreaChip area={{ icon: area?.icon ?? 'target', color: area?.color ?? 'azul-cinza', name: goal.title }} className={className} />
}

// ---------- Ritmo ----------

/** Sempre em tons neutros: nada de vermelho para "um pouco atrás". */
export function PacePill({ status }: { status: PaceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px]',
        status === 'behind' ? 'border-[0.5px] border-line text-muted' : 'bg-primary-soft text-ink',
      )}
    >
      {PACE_LABEL[status]}
    </span>
  )
}

// ---------- Estado vazio ----------

interface EmptyProps {
  illustration: IllustrationName
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

/** Ilustração (16px acima do título), título, uma linha de descrição e um botão. */
export function EmptyState({ illustration, icon: Icon, title, description, action, className }: EmptyProps) {
  const showArt = useIllustrations('core')
  return (
    <div className={cn('flex flex-col items-center px-6 py-8 text-center', className)}>
      {showArt ? (
        <Illustration name={illustration} level="core" decorative />
      ) : (
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon size={24} strokeWidth={1.75} />
        </span>
      )}
      <h2 className="mt-4 text-[17px] font-medium">{title}</h2>
      <p className="mt-1 text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ---------- Humor ----------

export const MOODS: { value: number; label: string; icon: LucideIcon }[] = [
  { value: 1, label: 'Difícil', icon: CloudRain },
  { value: 2, label: 'Nublado', icon: Cloud },
  { value: 3, label: 'Neutro', icon: CloudSun },
  { value: 4, label: 'Bom', icon: Sun },
  { value: 5, label: 'Ótimo', icon: Sparkles },
]

export function MoodPicker({ value, onChange }: { value: number | undefined; onChange: (value: number | undefined) => void }) {
  return (
    <div role="radiogroup" aria-label="Como foi o seu humor" className="flex justify-between gap-1">
      {MOODS.map(mood => {
        const selected = mood.value === value
        return (
          <button
            key={mood.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${mood.label}, ${mood.value} de 5`}
            onClick={() => onChange(selected ? undefined : mood.value)}
            className={cn(
              'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-ctl border-[0.5px] text-[12px] transition-colors',
              selected ? 'border-primary bg-primary-soft text-ink' : 'border-transparent text-muted hover:bg-primary-soft',
            )}
          >
            <mood.icon size={20} strokeWidth={1.75} aria-hidden />
            {mood.label}
          </button>
        )
      })}
    </div>
  )
}

export function MoodBadge({ mood }: { mood: number | undefined }) {
  const def = MOODS.find(item => item.value === mood)
  if (!def) return null
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <def.icon size={14} strokeWidth={1.75} aria-hidden />
      {def.label}
    </span>
  )
}

// ---------- Navegação ----------

export function BackButton({ href, label = 'Voltar' }: { href?: string; label?: string }) {
  const router = useRouter()
  if (href)
    return (
      <Link href={href} aria-label={label} className="icon-btn">
        <ChevronLeft size={20} strokeWidth={1.75} />
      </Link>
    )
  return (
    <button type="button" aria-label={label} className="icon-btn" onClick={() => router.back()}>
      <ChevronLeft size={20} strokeWidth={1.75} />
    </button>
  )
}

/** Título de seção com uma ilustração redonda pequena (ou ícone, sem ilustrações). */
export function SectionTitle({ title, illustration, icon: Icon, children }: { title: string; illustration?: IllustrationName; icon?: LucideIcon; children?: ReactNode }) {
  const showArt = useIllustrations('extra')
  return (
    <div className="flex items-center gap-3">
      {illustration && showArt ? (
        <Illustration name={illustration} height={44} decorative />
      ) : Icon ? (
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      ) : null}
      <h2 className="flex-1 text-[15px] font-medium">{title}</h2>
      {children}
    </div>
  )
}

/** Estrelas que saltam do ponto onde a tarefa foi concluída (menos de 1 segundo). */
export function StarBurst() {
  const stars = [
    [-22, -18, 'var(--primary)'],
    [20, -22, 'var(--area-tijolo)'],
    [28, 4, 'var(--area-mar)'],
    [-28, 6, 'var(--area-mar)'],
    [-10, 26, 'var(--area-tijolo)'],
    [14, 24, 'var(--primary)'],
  ] as const
  return (
    <span className="burst" aria-hidden>
      {stars.map(([dx, dy, fill], index) => (
        <svg key={index} width="12" height="12" viewBox="-6 -6 12 12" style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px` }}>
          <path d="M0-6Q0 0 6 0Q0 0 0 6Q0 0-6 0Q0 0 0-6Z" fill={fill} />
        </svg>
      ))}
    </span>
  )
}
