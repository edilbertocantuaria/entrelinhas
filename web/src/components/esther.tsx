import { cn } from '@/shared/utils'

/** Nome da guia de IA do app. */
export const ESTHER = 'Esther'

/**
 * Avatar da Esther: uma coruja no estilo das ilustrações (formas chapadas, cores do tema),
 * com uma pena atrás da asa. Pisca de leve de tempos em tempos (some com "reduzir movimento").
 */
export function EstherAvatar({ size = 28, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="20" cy="20" r="20" fill="var(--primary-soft)" />
      {/* pena */}
      <path d="M29.5 31.5c4-3.5 5-9 3.2-13.5-2.6 1.6-4.8 5.6-4.6 10.8Z" fill="var(--area-mar)" />
      <path d="M29.6 31.4 32.2 19" stroke="var(--surface)" strokeWidth="0.9" strokeLinecap="round" />
      {/* corpo e tufos */}
      <path d="M10.5 18.5c0-6 4.2-9.5 9.5-9.5s9.5 3.5 9.5 9.5v6.5c0 5.6-4.2 9-9.5 9s-9.5-3.4-9.5-9Z" fill="var(--primary)" />
      <path d="M11.8 12.6 10.6 6.8l4.6 3.4Z" fill="var(--primary)" />
      <path d="M28.2 12.6l1.2-5.8-4.6 3.4Z" fill="var(--primary)" />
      {/* barriga */}
      <path d="M14.5 26.5c0-2.6 2.5-4.4 5.5-4.4s5.5 1.8 5.5 4.4c0 3.2-2.5 5.5-5.5 5.5s-5.5-2.3-5.5-5.5Z" fill="var(--surface)" opacity="0.9" />
      <path
        d="M17 26.2q1.5 1.2 3 0q1.5 1.2 3 0M17.8 28.8q1.1 1 2.2 0q1.1 1 2.2 0"
        fill="none"
        stroke="var(--primary-soft)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      {/* olhos */}
      <circle cx="15.8" cy="17.6" r="3.9" fill="var(--surface)" />
      <circle cx="24.2" cy="17.6" r="3.9" fill="var(--surface)" />
      <g className="esther-blink">
        <circle cx="16.2" cy="17.8" r="1.9" fill="var(--text)" />
        <circle cx="23.8" cy="17.8" r="1.9" fill="var(--text)" />
        <circle cx="16.8" cy="17.1" r="0.6" fill="var(--surface)" />
        <circle cx="24.4" cy="17.1" r="0.6" fill="var(--surface)" />
      </g>
      {/* bico */}
      <path d="M20 20.2l-1.6 2.3h3.2Z" fill="var(--area-tijolo)" />
    </svg>
  )
}
