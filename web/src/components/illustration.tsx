'use client'

import { createContext, useContext } from 'react'
import { useStore } from '@/shared/store'
import { cn } from '@/shared/utils'
import { SCENES, type IllustrationName } from './illustrations/scenes'

export type { IllustrationName }

/** Nomes com arquivo em /public/illustrations/{nome}.svg, lidos no servidor. */
export const OverridesContext = createContext<string[]>([])

interface Props {
  name: IllustrationName
  /** altura máxima em px (padrão 160) */
  height?: number
  /**
   * "core": aparece também com a densidade "Poucas" (estados vazios, boas-vindas, retrospectiva).
   * "extra": só com "Muitas".
   */
  level?: 'core' | 'extra'
  /** decorativa: repete um texto vizinho e fica fora da árvore de acessibilidade */
  decorative?: boolean
  /** mostra mesmo com a densidade "Nenhuma" (seletor de ícone da meta) */
  always?: boolean
  className?: string
}

export function useIllustrations(level: 'core' | 'extra' = 'extra') {
  const density = useStore(state => state.settings.illustrations)
  return density === 'many' || (density === 'few' && level === 'core')
}

export function Illustration({ name, height = 160, level = 'extra', decorative = false, always = false, className }: Props) {
  const visible = useIllustrations(level) || always
  const overrides = useContext(OverridesContext)
  if (!visible) return null

  const scene = SCENES[name]
  const [w, h] = scene.box
  const a11y = decorative ? ({ 'aria-hidden': true } as const) : ({ role: 'img', 'aria-label': scene.label } as const)
  const style = { height, maxHeight: height, width: 'auto', maxWidth: '100%', aspectRatio: `${w} / ${h}` }

  if (overrides.includes(name)) {
    // SVG próprio da pasta public: o <Image> do Next não otimiza SVG, então o <img> simples basta
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/illustrations/${name}.svg`}
        alt={decorative ? '' : scene.label}
        aria-hidden={decorative || undefined}
        className={cn('block shrink-0', className)}
        style={style}
      />
    )
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className={cn('ill-enter block shrink-0', className)} style={style} {...a11y}>
      {scene.art}
    </svg>
  )
}

/** Mancha suave recortada pelo canto de um cartão. Sempre atrás do conteúdo. */
export function CornerBlob({ className }: { className?: string }) {
  const density = useStore(state => state.settings.illustrations)
  if (density === 'none') return null
  return (
    <svg aria-hidden viewBox="0 0 120 120" className={cn('pointer-events-none absolute -right-8 -top-10 -z-10 size-32', className)}>
      <path d="M12 62c-3-26 14-46 38-50 16-3 26 4 40 4 14 1 22 14 22 34 0 22-8 44-28 52-16 7-28 0-42 0-16 0-28-18-30-40Z" fill="var(--primary-soft)" />
      <circle cx="18" cy="100" r="2.5" fill="var(--primary)" opacity=".5" />
      <path d="M30 108v8M26 112h8" stroke="var(--area-mar)" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </svg>
  )
}
