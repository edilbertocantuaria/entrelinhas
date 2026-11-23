import type { ReactNode } from 'react'

/**
 * Primitivas do estilo "flat design vector".
 * Só preenchimentos sólidos, formas geométricas simples e cores vindas de variáveis CSS,
 * para funcionar nos temas claro e escuro. Toda cena é composta a partir daqui.
 */
export const C = {
  primary: 'var(--primary)',
  soft: 'var(--primary-soft)',
  navy: 'var(--text)',
  teal: 'var(--area-mar)',
  warm: 'var(--area-tijolo)',
  paper: 'var(--surface)',
  line: 'var(--border)',
}

export type Place = { x?: number; y?: number; s?: number; rot?: number; className?: string }

/** Posiciona um grupo. Classes de animação vão num <g> interno para não brigar com o transform. */
export function G({ x = 0, y = 0, s = 1, rot = 0, className, children }: Place & { children: ReactNode }) {
  const group = <g transform={`translate(${x} ${y})${rot ? ` rotate(${rot})` : ''}${s !== 1 ? ` scale(${s})` : ''}`}>{children}</g>
  return className ? <g className={className}>{group}</g> : group
}

/** Junta a animação padrão da peça com a classe que a cena pedir. */
const motion = (base: string, extra?: string) => (extra ? `${base} ${extra}` : base)

// ---------- Fundo ----------

const BLOBS = [
  'M44 122c-6-42 24-80 64-88 30-6 48 9 80 5 42-5 84 15 94 52 9 33-6 72-30 94-24 22-52 21-86 17-34-4-58 11-88 0-27-10-29-46-34-80Z',
  'M58 96c8-38 46-62 86-60 26 1 40 14 66 14 36 0 66 22 70 58 4 34-18 70-50 84-28 12-50 2-78 6-32 5-58 8-80-14-20-20-20-56-14-88Z',
  // 120 x 120, para ilustrações pequenas
  'M12 62c-3-26 14-46 38-50 16-3 26 4 40 4 14 1 22 14 22 34 0 22-8 44-28 52-16 7-28 0-42 0-16 0-28-18-30-40Z',
]

export function Blob({ variant = 0, fill = C.soft, ...place }: Place & { variant?: number; fill?: string }) {
  return (
    <G {...place}>
      <path d={BLOBS[variant]} fill={fill} />
    </G>
  )
}

export function GridLines({ w = 320, h = 240, gap = 24, inset = 28 }: { w?: number; h?: number; gap?: number; inset?: number }) {
  const xs = Array.from({ length: Math.floor((w - inset * 2) / gap) + 1 }, (_, i) => inset + i * gap)
  const ys = Array.from({ length: Math.floor((h - inset * 2) / gap) + 1 }, (_, i) => inset + i * gap)
  return (
    <g stroke={C.line} strokeWidth="1">
      {xs.map(x => (
        <path key={`x${x}`} d={`M${x} ${inset - 8}V${h - inset + 8}`} />
      ))}
      {ys.map(y => (
        <path key={`y${y}`} d={`M${inset - 8} ${y}H${w - inset + 8}`} />
      ))}
    </g>
  )
}

export function Dots({ pts, fill = C.primary }: { pts: [number, number, number?][]; fill?: string }) {
  return (
    <g fill={fill}>
      {pts.map(([cx, cy, r = 2.5], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  )
}

/** Estrela de 4 pontas */
export function Star({ x = 0, y = 0, r = 6, fill = C.primary }: { x?: number; y?: number; r?: number; fill?: string }) {
  // cada estrela pisca num tempo próprio, definido pela posição
  const delay = -(((Math.abs(x) * 7 + Math.abs(y) * 13) % 38) / 10)
  return (
    <g className="ill-twinkle" style={{ animationDelay: `${delay}s` }}>
      <path transform={`translate(${x} ${y})`} d={`M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}Z`} fill={fill} />
    </g>
  )
}

export function Stars({ pts, fill }: { pts: [number, number, number?][]; fill?: string }) {
  return (
    <>
      {pts.map(([x, y, r], i) => (
        <Star key={i} x={x} y={y} r={r} fill={fill} />
      ))}
    </>
  )
}

export function PlusSign({ x = 0, y = 0, r = 4, fill = C.teal }: { x?: number; y?: number; r?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={fill}>
      <rect x={-r} y={-1.25} width={r * 2} height={2.5} rx={1.25} />
      <rect x={-1.25} y={-r} width={2.5} height={r * 2} rx={1.25} />
    </g>
  )
}

const DECO: { dots: [number, number, number, string][]; plus: [number, number][]; stars: [number, number, number, string][] }[] = [
  {
    dots: [
      [36, 62, 3, C.primary],
      [290, 152, 2.5, C.teal],
      [66, 216, 2, C.warm],
    ],
    plus: [
      [274, 40],
      [26, 168],
    ],
    stars: [
      [296, 92, 6, C.primary],
      [58, 30, 5, C.warm],
    ],
  },
  {
    dots: [
      [44, 196, 3, C.primary],
      [280, 54, 2.5, C.warm],
      [254, 220, 2, C.teal],
    ],
    plus: [
      [38, 78],
      [296, 184],
    ],
    stars: [
      [88, 22, 5, C.primary],
      [302, 118, 6, C.teal],
    ],
  },
]

/** Fundo padrão das cenas 320 x 240: linhas de grade, mancha orgânica e pequenos enfeites. */
export function Backdrop({ variant = 0 }: { variant?: 0 | 1 }) {
  const deco = DECO[variant]
  return (
    <>
      <GridLines />
      <g className="ill-breathe">
        <Blob variant={variant} />
      </g>
      {deco.dots.map(([cx, cy, r, fill], i) => (
        <g key={i} className="ill-float" style={{ animationDelay: `${-i * 1.1}s` }}>
          <circle cx={cx} cy={cy} r={r} fill={fill} />
        </g>
      ))}
      {deco.plus.map(([x, y], i) => (
        <g key={i} className="ill-twinkle" style={{ animationDelay: `${-0.9 - i * 1.3}s` }}>
          <PlusSign x={x} y={y} />
        </g>
      ))}
      {deco.stars.map(([x, y, r, fill], i) => (
        <Star key={i} x={x} y={y} r={r} fill={fill} />
      ))}
    </>
  )
}

/** Fundo das ilustrações pequenas (120 x 120). */
export function SpotBackdrop({ round = false }: { round?: boolean }) {
  return (
    <>
      <g className="ill-breathe">{round ? <circle cx="60" cy="60" r="58" fill={C.soft} /> : <Blob variant={2} />}</g>
      <g className="ill-float">
        <circle cx="104" cy="18" r="2.5" fill={C.primary} />
      </g>
      <g className="ill-twinkle" style={{ animationDelay: '-1.2s' }}>
        <PlusSign x={14} y={24} r={3.5} />
      </g>
      <Star x={106} y={98} r={5} fill={C.warm} />
    </>
  )
}

export function Ground({ x = 40, y = 190, w = 240 }: { x?: number; y?: number; w?: number }) {
  return <rect x={x} y={y} width={w} height="4" rx="2" fill={C.navy} />
}

// ---------- Objetos ----------

/** 40 x 62 */
export function Plant(place: Place) {
  return (
    <G {...place}>
      <g className="ill-sway">
        <path d="M19 44C6 38 0 24 4 10c13 5 19 19 15 34Z" fill={C.teal} />
        <path d="M21 44c-1-17 5-31 15-38 5 13 1 29-15 38Z" fill={C.primary} />
      </g>
      <path d="M7 42h26l-3 17a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3Z" fill={C.warm} />
    </G>
  )
}

/** 44 x 40 */
export function CoffeeCup({ fill = C.paper, ...place }: Place & { fill?: string }) {
  return (
    <G {...place}>
      <g className="ill-steam">
        <rect x="11" y="0" width="3" height="9" rx="1.5" fill={C.primary} />
        <rect x="20" y="2" width="3" height="7" rx="1.5" fill={C.primary} />
      </g>
      <path d="M32 17h3a6 6 0 0 1 0 12h-3" fill="none" stroke={fill} strokeWidth="4" />
      <path d="M4 13h28v15a9 9 0 0 1-9 9H13a9 9 0 0 1-9-9Z" fill={fill} />
      <rect x="0" y="37" width="36" height="3" rx="1.5" fill={C.navy} />
    </G>
  )
}

/** 46 de largura, 10 por moeda */
export function Coins({ n = 3, ...place }: Place & { n?: number }) {
  return (
    <G {...place}>
      {Array.from({ length: n }, (_, i) => {
        const dx = i % 2 ? 2 : 0
        const y = (n - 1 - i) * 10
        return (
          <g key={i}>
            <rect x={dx} y={y} width="44" height="9" rx="4.5" fill={C.warm} />
            <rect x={dx + 8} y={y + 3} width="12" height="3" rx="1.5" fill={C.paper} />
          </g>
        )
      })}
    </G>
  )
}

/** 96 x 92. `marks`: índices das células destacadas (0 a 11). */
export function Calendar({
  marks = [],
  cells = true,
  band = C.primary,
  children,
  ...place
}: Place & { marks?: number[]; cells?: boolean; band?: string; children?: ReactNode }) {
  const colors = [C.teal, C.warm, C.primary]
  return (
    <G {...place}>
      <rect x="0" y="6" width="96" height="86" rx="10" fill={C.paper} />
      <path d="M0 16A10 10 0 0 1 10 6h76a10 10 0 0 1 10 10v12H0Z" fill={band} />
      <rect x="22" y="0" width="6" height="14" rx="3" fill={C.navy} />
      <rect x="68" y="0" width="6" height="14" rx="3" fill={C.navy} />
      {cells &&
        Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={12 + (i % 4) * 19}
            y={38 + Math.floor(i / 4) * 17}
            width="13"
            height="11"
            rx="3"
            fill={marks.includes(i) ? colors[marks.indexOf(i) % colors.length] : C.line}
          />
        ))}
      {children}
    </G>
  )
}

/** 84 x 96 */
export function Checklist({ rows = 3, checked = 2, ...place }: Place & { rows?: number; checked?: number }) {
  return (
    <G {...place}>
      <rect width="84" height={24 + rows * 24} rx="10" fill={C.paper} />
      {Array.from({ length: rows }, (_, i) => {
        const y = 24 + i * 24
        const on = i < checked
        return (
          <g key={i}>
            <circle cx="20" cy={y} r="8" fill={on ? C.primary : C.line} />
            {on && <path d={`M16 ${y}l3 3 5-6`} fill="none" stroke={C.paper} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            <rect x="36" y={y - 3} width={i % 2 ? 28 : 38} height="6" rx="3" fill={C.line} />
          </g>
        )
      })}
    </G>
  )
}

/** Fechado: 72 x 92. Aberto: 128 x 84. */
export function Notebook({ open = false, ...place }: Place & { open?: boolean }) {
  if (!open)
    return (
      <G {...place}>
        <rect width="72" height="92" rx="8" fill={C.navy} />
        <path d="M8 0h8v92H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8Z" fill={C.primary} />
        <rect x="26" y="16" width="32" height="18" rx="4" fill={C.paper} />
        <rect x="60" y="0" width="5" height="92" fill={C.warm} />
      </G>
    )
  return (
    <G {...place}>
      <path d="M0 10q32-12 64 0v72q-32-12-64 0Z" fill={C.paper} />
      <path d="M64 10q32-12 64 0v72q-32-12-64 0Z" fill={C.paper} />
      <rect x="62.5" y="8" width="3" height="74" fill={C.line} />
      {[26, 38, 50].map((y, i) => (
        <g key={y} fill={C.line}>
          <rect x="12" y={y} width={i === 2 ? 28 : 40} height="5" rx="2.5" />
          <rect x="76" y={y} width={i === 2 ? 30 : 40} height="5" rx="2.5" />
        </g>
      ))}
    </G>
  )
}

/** Livro aberto com capa, 128 x 90 */
export function Book(place: Place) {
  return (
    <G {...place}>
      <path d="M0 18h128v68a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4Z" fill={C.teal} />
      <Notebook open x={5} y={0} s={0.92} />
      <path d="M94 4h10v26l-5-5-5 5Z" fill={C.warm} />
    </G>
  )
}

/** Centrado em (x, y) */
export function Target({ r = 48, arrow = false, ...place }: Place & { r?: number; arrow?: boolean }) {
  return (
    <G {...place} className={motion('ill-float-slow', place.className)}>
      <circle r={r} fill={C.paper} />
      <circle r={r * 0.74} fill={C.primary} />
      <circle r={r * 0.46} fill={C.paper} />
      <circle r={r * 0.2} fill={C.warm} />
      {arrow && (
        <g transform="rotate(-38)">
          <rect x="0" y="-2.5" width={r * 1.25} height="5" rx="2.5" fill={C.navy} />
          <path d={`M${r * 1.2} 0l8-9h12l-7 9 7 9h-12Z`} fill={C.warm} />
        </g>
      )}
    </G>
  )
}

/** Peça de 36 x 36 */
export function PuzzlePiece({ fill = C.primary, ...place }: Place & { fill?: string }) {
  return (
    <G {...place}>
      <rect width="36" height="36" rx="6" fill={fill} />
      <circle cx="18" cy="0" r="6" fill={fill} />
    </G>
  )
}

/** Quebra-cabeça 2 x 2, 76 x 76. Com `last={false}` falta a última peça. */
export function Puzzle({ last = true, ...place }: Place & { last?: boolean }) {
  return (
    <G {...place}>
      <rect x="0" y="0" width="36" height="36" rx="6" fill={C.primary} />
      <rect x="40" y="0" width="36" height="36" rx="6" fill={C.teal} />
      <rect x="0" y="40" width="36" height="36" rx="6" fill={C.paper} />
      <rect x="40" y="40" width="36" height="36" rx="6" fill={last ? C.warm : C.line} />
      <circle cx="39" cy="18" r="6" fill={C.primary} />
      <circle cx="18" cy="39" r="6" fill={C.primary} />
      {last && <circle cx="58" cy="39" r="6" fill={C.warm} />}
      <circle cx="39" cy="58" r="6" fill={C.paper} />
    </G>
  )
}

/** 120 x 88 */
export function ChartCard({ bars = false, ...place }: Place & { bars?: boolean }) {
  return (
    <G {...place}>
      <rect width="120" height="88" rx="10" fill={C.paper} />
      {[26, 46, 66].map(y => (
        <rect key={y} x="14" y={y} width="92" height="1.5" fill={C.line} />
      ))}
      {bars ? (
        [20, 34, 26, 46, 38].map((height, i) => (
          <g key={i} className="ill-bar" style={{ animationDelay: `${-i * 0.45}s` }}>
            <rect x={18 + i * 19} y={74 - height} width="11" height={height} rx="3" fill={i === 4 ? C.warm : C.primary} />
          </g>
        ))
      ) : (
        <>
          <path
            d="M16 66l22-14 18 8 24-26 22-10"
            fill="none"
            stroke={C.primary}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="ill-draw"
          />
          <g className="ill-pulse">
            <circle cx="102" cy="24" r="6" fill={C.warm} />
          </g>
        </>
      )}
    </G>
  )
}

/** 100 x 76. Aberto: a carta sai por cima, até y = -30. */
export function Envelope({ open = false, badge = false, ...place }: Place & { open?: boolean; badge?: boolean }) {
  place = { ...place, className: motion('ill-float', place.className) }
  if (!open)
    return (
      <G {...place}>
        <rect y="20" width="100" height="56" rx="8" fill={C.primary} />
        <path d="M4 22h92L50 56Z" fill={C.teal} />
      </G>
    )
  return (
    <G {...place}>
      <path d="M0 26 50-8l50 34Z" fill={C.teal} />
      <rect x="12" y="-30" width="76" height="84" rx="6" fill={C.paper} />
      <rect x="24" y="-16" width="34" height="5" rx="2.5" fill={C.line} />
      <rect x="24" y="-4" width="52" height="5" rx="2.5" fill={C.line} />
      <rect x="24" y="8" width="40" height="5" rx="2.5" fill={C.line} />
      {badge && (
        <>
          <circle cx="74" cy="-15" r="9" fill={C.warm} />
          <circle cx="74" cy="-19.5" r="1.7" fill={C.paper} />
          <rect x="72.5" y="-16.5" width="3" height="7" rx="1.5" fill={C.paper} />
        </>
      )}
      <path d="M0 26l50 30 50-30v42a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8Z" fill={C.primary} />
    </G>
  )
}

/** Centrada em (x, y) */
export function Magnifier({ r = 24, ...place }: Place & { r?: number }) {
  return (
    <G {...place} className={motion('ill-drift', place.className)}>
      <rect x={r - 3} y="-5" width={r * 1.1} height="10" rx="5" transform="rotate(45)" fill={C.navy} />
      <circle r={r} fill={C.navy} />
      <circle r={r - 6} fill={C.paper} />
      <circle cx={-r * 0.3} cy={-r * 0.3} r={r * 0.14} fill={C.soft} />
    </G>
  )
}

/** Centrada em (x, y) */
export function Gear({ r = 18, fill = C.navy, hole = C.soft, ...place }: Place & { r?: number; fill?: string; hole?: string }) {
  return (
    <G {...place}>
      <g className="ill-gear">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={-r * 0.2} y={-r * 1.3} width={r * 0.4} height={r * 0.6} rx="2" transform={`rotate(${i * 45})`} fill={fill} />
        ))}
        <circle r={r} fill={fill} />
        <circle r={r * 0.42} fill={hole} />
      </g>
    </G>
  )
}

/** 28 x 52 */
export function Flag({ fill = C.warm, ...place }: Place & { fill?: string }) {
  return (
    <G {...place}>
      <rect width="3.5" height="52" rx="1.75" fill={C.navy} />
      <g className="ill-wave">
        <path d="M3 3h24l-7 9 7 9H3Z" fill={fill} />
      </g>
    </G>
  )
}

/** Centrado em (x, y) */
export function Sun({ r = 22, face = false, fill = C.warm, ...place }: Place & { r?: number; face?: boolean; fill?: string }) {
  return (
    <G {...place}>
      <g className="ill-rays">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-2.5" y={-r * 1.62} width="5" height={r * 0.38} rx="2.5" transform={`rotate(${i * 45})`} fill={fill} />
        ))}
      </g>
      <circle r={r} fill={fill} />
      {face && (
        <>
          <circle cx={-r * 0.32} cy={-r * 0.14} r={r * 0.09} fill={C.navy} />
          <circle cx={r * 0.32} cy={-r * 0.14} r={r * 0.09} fill={C.navy} />
          <path d={`M${-r * 0.34} ${r * 0.2}Q0 ${r * 0.56} ${r * 0.34} ${r * 0.2}`} fill="none" stroke={C.navy} strokeWidth={r * 0.1} strokeLinecap="round" />
        </>
      )}
    </G>
  )
}

/** Lua crescente centrada em (x, y) */
export function Moon({ r = 22, fill = C.primary, ...place }: Place & { r?: number; fill?: string }) {
  const a = r * 0.25
  const b = r * 0.97
  return (
    <G {...place} className={motion('ill-float', place.className)}>
      <path d={`M${a} ${-b}A${r} ${r} 0 1 0 ${b} ${a}A${r * 0.78} ${r * 0.78} 0 0 1 ${a} ${-b}Z`} fill={fill} />
    </G>
  )
}

/** 52 x 56 */
export function Trophy(place: Place) {
  return (
    <G {...place} className={motion('ill-float', place.className)}>
      <path d="M8 6H2a10 10 0 0 0 10 16M44 6h6a10 10 0 0 1-10 16" fill="none" stroke={C.warm} strokeWidth="5" strokeLinecap="round" />
      <path d="M8 0h36v20a18 18 0 0 1-36 0Z" fill={C.warm} />
      <rect x="22" y="36" width="8" height="12" fill={C.warm} />
      <rect x="12" y="48" width="28" height="8" rx="3" fill={C.navy} />
      <Star x={26} y={17} r={8} fill={C.paper} />
    </G>
  )
}

/** Personagem sem rosto, 40 x 96. `arm` gira o braço (graus). */
export function FacelessCharacter({ jacket = C.warm, arm = -40, ...place }: Place & { jacket?: string; arm?: number }) {
  return (
    <G {...place}>
      <rect x="9" y="58" width="9" height="34" rx="4.5" fill={C.navy} />
      <rect x="22" y="58" width="9" height="34" rx="4.5" fill={C.navy} />
      <rect x="9" y="90" width="14" height="6" rx="3" fill={C.navy} />
      <rect x="22" y="90" width="14" height="6" rx="3" fill={C.navy} />
      <rect x="4" y="22" width="32" height="44" rx="10" fill={jacket} />
      <g transform={`rotate(${arm} 30 30)`}>
        <g className="ill-arm">
          <rect x="26" y="26" width="30" height="9" rx="4.5" fill={jacket} />
          <circle cx="56" cy="30.5" r="5" fill={C.paper} />
        </g>
      </g>
      <circle cx="20" cy="10" r="10" fill={C.paper} />
      <path d="M10 10a10 10 0 0 1 20 0Z" fill={C.navy} />
    </G>
  )
}

/** 150 x 96 */
export function Mountain(place: Place) {
  return (
    <G {...place}>
      <path d="M0 96 50 22l50 74Z" fill={C.teal} />
      <path d="M46 96 100 8l50 88Z" fill={C.primary} />
      <path d="M100 8 86 31l8-4 6 7 6-7 8 4Z" fill={C.paper} />
    </G>
  )
}

/** Degraus subindo para a direita. Cada degrau: 16 de largura, 10 de altura. */
export function Steps({ n = 4, fill = C.navy, ...place }: Place & { n?: number; fill?: string }) {
  return (
    <G {...place}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={i * 16} y={(n - 1 - i) * 10} width="16" height={(i + 1) * 10} fill={fill} />
      ))}
    </G>
  )
}

/** Balança de banheiro, 76 x 64 */
export function Scale(place: Place) {
  return (
    <G {...place}>
      <rect width="76" height="64" rx="14" fill={C.primary} />
      <path d="M20 30a18 18 0 0 1 36 0Z" fill={C.paper} />
      <rect x="36.75" y="15" width="2.5" height="15" rx="1.25" transform="rotate(28 38 30)" fill={C.warm} />
      <rect x="14" y="40" width="18" height="14" rx="6" fill={C.soft} />
      <rect x="44" y="40" width="18" height="14" rx="6" fill={C.soft} />
    </G>
  )
}

/** 84 x 32 */
export function Dumbbell(place: Place) {
  return (
    <G {...place} className={motion('ill-float', place.className)}>
      <rect x="10" y="13" width="64" height="6" rx="3" fill={C.navy} />
      <rect x="8" y="0" width="10" height="32" rx="4" fill={C.primary} />
      <rect x="0" y="6" width="8" height="20" rx="3" fill={C.teal} />
      <rect x="66" y="0" width="10" height="32" rx="4" fill={C.primary} />
      <rect x="76" y="6" width="8" height="20" rx="3" fill={C.teal} />
    </G>
  )
}

/** Centrado em (x, y) */
export function Clock({ r = 20, rim = C.primary, ...place }: Place & { r?: number; rim?: string }) {
  return (
    <G {...place}>
      <circle r={r} fill={rim} />
      <circle r={r - 5} fill={C.paper} />
      <rect x="-1.75" y={-(r - 9)} width="3.5" height={r - 8} rx="1.75" fill={C.navy} />
      <g className="ill-hand">
        <rect x="-1.75" y={-(r - 11)} width="3.5" height={r - 10} rx="1.75" transform="rotate(115)" fill={C.navy} />
      </g>
      <circle r="3" fill={C.warm} />
    </G>
  )
}

/** 96 x 52 */
export function Cloud({ fill = C.paper, ...place }: Place & { fill?: string }) {
  return (
    <G {...place} className={motion('ill-drift', place.className)}>
      <g fill={fill}>
        <circle cx="30" cy="30" r="18" />
        <circle cx="52" cy="22" r="22" />
        <circle cx="74" cy="32" r="16" />
        <rect x="12" y="30" width="78" height="22" rx="11" />
      </g>
    </G>
  )
}

/** 44 x 52 */
export function Shield(place: Place) {
  return (
    <G {...place}>
      <path d="M22 0 42 7v17c0 13-8 22-20 28C10 46 2 37 2 24V7Z" fill={C.teal} />
      <path d="m13 25 7 7 12-14" fill="none" stroke={C.paper} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  )
}

/** 40 x 36 */
export function Heart({ fill = C.warm, ...place }: Place & { fill?: string }) {
  return (
    <G {...place} className={motion('ill-pulse', place.className)}>
      <path d="M20 36C6 26 0 18 0 10.5A10.5 10.5 0 0 1 20 6a10.5 10.5 0 0 1 20 4.5C40 18 34 26 20 36Z" fill={fill} />
    </G>
  )
}

/** Centrada em (x, y) */
export function Compass({ r = 22, ...place }: Place & { r?: number }) {
  const n = r - 9
  return (
    <G {...place}>
      <circle r={r} fill={C.navy} />
      <circle r={r - 5} fill={C.paper} />
      <g className="ill-needle">
        <g transform="rotate(32)">
          <path d={`M0 ${-n}L5 0H-5Z`} fill={C.warm} />
          <path d={`M0 ${n}L5 0H-5Z`} fill={C.navy} />
        </g>
      </g>
      <circle r="2" fill={C.paper} />
    </G>
  )
}

/** 90 x 18 */
export function Ruler(place: Place) {
  return (
    <G {...place}>
      <rect width="90" height="18" rx="4" fill={C.warm} />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={9 + i * 10} y="0" width="2" height={i % 2 ? 6 : 10} fill={C.navy} />
      ))}
    </G>
  )
}

/** 70 x 54 */
export function PiggyBank(place: Place) {
  return (
    <G {...place} className={motion('ill-float-slow', place.className)}>
      <rect x="16" y="40" width="9" height="14" rx="3" fill={C.primary} />
      <rect x="42" y="40" width="9" height="14" rx="3" fill={C.primary} />
      <path d="M40 9 51 2l1 13Z" fill={C.teal} />
      <ellipse cx="34" cy="28" rx="28" ry="20" fill={C.primary} />
      <rect x="54" y="21" width="16" height="14" rx="6" fill={C.primary} />
      <rect x="24" y="12" width="16" height="3.5" rx="1.75" fill={C.navy} />
      <circle cx="49" cy="23" r="2.2" fill={C.navy} />
    </G>
  )
}

/** 30 x 44 */
export function Leaf({ fill = C.teal, ...place }: Place & { fill?: string }) {
  return (
    <G {...place} className={motion('ill-sway', place.className)}>
      <path d="M15 44C2 34 0 18 15 0c15 18 13 34 0 44Z" fill={fill} />
    </G>
  )
}

/** Caneta, 8 x 56, ponta para baixo */
export function Pen(place: Place) {
  return (
    <G {...place} className={motion('ill-sway', place.className)}>
      <rect width="8" height="46" rx="3" fill={C.warm} />
      <rect width="8" height="8" rx="3" fill={C.navy} />
      <path d="M0 45h8l-4 11Z" fill={C.navy} />
    </G>
  )
}

/** Centrado em (x, y) */
export function CheckBadge({ r = 14, fill = C.primary, ...place }: Place & { r?: number; fill?: string }) {
  return (
    <G {...place} className={motion('ill-pulse', place.className)}>
      <circle r={r} fill={fill} />
      <path
        d={`M${-r * 0.4} 0l${r * 0.28} ${r * 0.3} ${r * 0.52}-${r * 0.6}`}
        fill="none"
        stroke={C.paper}
        strokeWidth={r * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  )
}

/** Selo com estrela, centrado em (x, y) */
export function StarBadge({ r = 16, fill = C.warm, ...place }: Place & { r?: number; fill?: string }) {
  return (
    <G {...place} className={motion('ill-pulse', place.className)}>
      <circle r={r} fill={fill} />
      <Star r={r * 0.62} fill={C.paper} />
    </G>
  )
}

/** Ladrilho arredondado com um símbolo dentro */
export function Tile({ size = 60, children, ...place }: Place & { size?: number; children?: ReactNode }) {
  return (
    <G {...place}>
      <rect width={size} height={size} rx="12" fill={C.paper} />
      {children}
    </G>
  )
}
