'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/utils'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={value => onChange(value)}
      aria-label={label}
      // trilho de 44 x 26 com a bolinha centralizada na vertical; a área de toque chega a 44px de altura
      className="relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-full bg-line p-[3px] transition-colors after:absolute after:-inset-y-[9px] after:inset-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[checked]:bg-primary"
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-surface shadow-[0_1px_2px_rgb(7_32_45/0.25)] transition-transform duration-200 data-[checked]:translate-x-[18px] data-[checked]:bg-on-primary" />
    </SwitchPrimitive.Root>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
  label: string
  className?: string
}

export function Segmented<T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-1 rounded-ctl bg-primary-soft p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(option => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-11 items-center justify-center gap-1.5 rounded-[8px] text-[13px] transition-colors',
              selected ? 'bg-surface font-medium text-ink' : 'text-muted',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (value: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className="icon-btn border-[0.5px] border-line bg-surface"
        aria-label="Diminuir"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={18} strokeWidth={1.75} />
      </button>
      <span className="w-8 text-center text-[15px] font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="icon-btn border-[0.5px] border-line bg-surface"
        aria-label="Aumentar"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={18} strokeWidth={1.75} />
      </button>
    </div>
  )
}

/** Chip de escolha (filtros, motivos, metas). */
export function Chip({
  selected,
  onClick,
  children,
  className,
  ...rest
}: {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-[0.5px] px-3.5 text-[13px] whitespace-nowrap transition-colors',
        selected ? 'border-primary bg-primary-soft text-ink' : 'border-line bg-surface text-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Fileira com rolagem lateral (chips, filtros).
 * No toque, desliza com o dedo. Com mouse: arrastar, roda do mouse ou as setas nas pontas.
 */
export function ScrollRow({
  children,
  className,
  label,
  fade = 'var(--bg)',
}: {
  children: ReactNode
  className?: string
  label?: string
  /** cor do fundo onde a fileira está, para o esmaecido das pontas */
  fade?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, moved: false, x: 0, left: 0 })
  const [edges, setEdges] = useState({ start: false, end: false })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ start: el.scrollLeft > 2, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    // roda do mouse vertical vira rolagem lateral enquanto houver para onde ir
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const next = el.scrollLeft + event.deltaY
      if ((event.deltaY < 0 && el.scrollLeft <= 0) || (event.deltaY > 0 && el.scrollLeft >= max)) return
      event.preventDefault()
      el.scrollLeft = Math.max(0, Math.min(max, next))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [update])

  const step = (direction: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  const arrow =
    'absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border-[0.5px] border-line bg-surface text-ink after:absolute after:-inset-1 [@media(hover:none)]:hidden'

  return (
    <div className="relative">
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className={cn('flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [@media(hover:hover)]:cursor-grab', className)}
        onScroll={update}
        onPointerDown={event => {
          if (event.pointerType !== 'mouse' || event.button !== 0 || !ref.current) return
          drag.current = { active: true, moved: false, x: event.clientX, left: ref.current.scrollLeft }
        }}
        onPointerMove={event => {
          const state = drag.current
          const el = ref.current
          if (!state.active || !el) return
          const dx = event.clientX - state.x
          if (!state.moved && Math.abs(dx) > 5) {
            state.moved = true
            el.setPointerCapture(event.pointerId)
            el.style.cursor = 'grabbing'
          }
          if (state.moved) el.scrollLeft = state.left - dx
        }}
        onPointerUp={event => {
          drag.current.active = false
          if (ref.current) ref.current.style.cursor = ''
          if (ref.current?.hasPointerCapture(event.pointerId)) ref.current.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          drag.current.active = false
          drag.current.moved = false
        }}
        onClickCapture={event => {
          // um arrasto não vale como toque no chip onde terminou
          if (drag.current.moved) {
            event.preventDefault()
            event.stopPropagation()
            drag.current.moved = false
          }
        }}
        onDragStart={event => event.preventDefault()}
      >
        {children}
      </div>
      {edges.start && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-10"
            style={{ background: `linear-gradient(to right, ${fade}, transparent)` }}
          />
          <button type="button" tabIndex={-1} aria-hidden className={cn(arrow, 'left-1')} onClick={() => step(-1)}>
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
        </>
      )}
      {edges.end && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10"
            style={{ background: `linear-gradient(to left, ${fade}, transparent)` }}
          />
          <button type="button" tabIndex={-1} aria-hidden className={cn(arrow, 'right-1')} onClick={() => step(1)}>
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </>
      )}
    </div>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  )
}

export function ProgressBar({ value, color = 'var(--primary)', label }: { value: number; color?: string; label?: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 overflow-hidden rounded-full bg-primary-soft"
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${percent}%`, background: color }} />
    </div>
  )
}
