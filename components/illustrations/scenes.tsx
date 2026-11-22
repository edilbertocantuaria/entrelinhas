import type { ReactNode } from 'react'
import {
  Backdrop, Book, C, Calendar, ChartCard, CheckBadge, Checklist, Clock, Cloud, CoffeeCup, Coins, Compass, Dots, Dumbbell,
  Envelope, FacelessCharacter, Flag, G, Gear, Ground, Heart, Leaf, Magnifier, Moon, Mountain, Notebook, Pen, PiggyBank,
  Plant, PlusSign, Puzzle, PuzzlePiece, Ruler, Scale, Shield, SpotBackdrop, Star, StarBadge, Stars, Steps, Sun, Target,
  Tile, Trophy,
} from './primitives'

export interface Scene {
  /** descrição em pt-BR para leitores de tela */
  label: string
  /** viewBox: cenas grandes 320 x 240, pequenas 120 x 120 */
  box: [number, number]
  art: ReactNode
}

const full = (label: string, art: ReactNode, variant: 0 | 1 = 0): Scene => ({
  label,
  box: [320, 240],
  art: (
    <>
      <Backdrop variant={variant} />
      {art}
    </>
  ),
})

const spot = (label: string, art: ReactNode, round = false): Scene => ({
  label,
  box: [120, 120],
  art: (
    <>
      <SpotBackdrop round={round} />
      {art}
    </>
  ),
})

const confetti = (
  <>
    <Dots pts={[[84, 66, 3], [236, 84, 3], [262, 132, 2.5]]} fill={C.teal} />
    <Dots pts={[[70, 110, 2.5], [222, 52, 3], [250, 170, 2.5]]} fill={C.warm} />
    <Dots pts={[[104, 44, 2.5], [270, 100, 2.5]]} fill={C.primary} />
  </>
)

const journalArt = (
  <>
    <Ground />
    <CoffeeCup x={42} y={150} />
    <Notebook open x={92} y={98} s={1.05} />
    <Pen x={226} y={70} rot={32} />
    <Plant x={244} y={128} />
    <Dots pts={[[120, 70, 3], [196, 58, 2.5]]} fill={C.teal} />
  </>
)

const shelfArt = (
  <>
    <rect x="58" y="152" width="136" height="14" rx="7" fill={C.navy} />
    <rect x="70" y="112" width="34" height="40" rx="8" fill={C.paper} />
    <rect x="110" y="98" width="32" height="54" rx="8" fill={C.primary} />
    <rect x="148" y="118" width="34" height="34" rx="8" fill={C.teal} />
    <rect x="208" y="112" width="78" height="6" rx="3" fill={C.navy} />
    <rect x="218" y="86" width="22" height="26" rx="6" fill={C.warm} />
    <rect x="246" y="94" width="24" height="18" rx="6" fill={C.paper} />
    <text x="247" y="138" textAnchor="middle" fontSize="13" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-figtree), sans-serif' }}>
      Depois
    </text>
  </>
)

export const SCENES = {
  // ---------- Estados vazios e cenas principais ----------
  'goals-empty': full(
    'Alvo com uma flecha no centro, uma bandeira e uma pilha de moedas',
    <>
      <Ground />
      <Flag x={62} y={138} />
      <Target x={152} y={126} r={56} arrow />
      <Coins x={234} y={160} n={3} />
      <Stars pts={[[250, 78, 8], [96, 66, 5]]} />
    </>,
  ),
  'today-empty': full(
    'Página de calendário com um sol, um vaso de planta e uma xícara de café',
    <>
      <Ground />
      <CoffeeCup x={48} y={150} />
      <Calendar x={104} y={80} s={1.2} cells={false}>
        <Sun x={48} y={60} r={15} />
      </Calendar>
      <Plant x={236} y={128} />
    </>,
    1,
  ),
  'day-closed': full(
    'Lua e estrelas sobre um caderno fechado com um selo de concluído',
    <>
      <Moon x={104} y={70} r={24} />
      <Stars pts={[[156, 52, 7], [206, 74, 5], [236, 48, 6]]} fill={C.warm} />
      <Ground y={196} />
      <Notebook x={124} y={104} />
      <CheckBadge x={194} y={180} r={17} />
      <Plant x={222} y={134} />
    </>,
  ),
  'journal-empty': full('Caderno aberto com uma caneta, uma xícara de café e uma planta', journalArt, 1),
  'review-header': full(
    'Cartão com um gráfico subindo, uma lupa, uma engrenagem e moedas',
    <>
      <ChartCard x={70} y={72} s={1.15} />
      <Coins x={44} y={164} n={3} />
      <Gear x={248} y={182} r={13} />
      <Magnifier x={216} y={104} r={28} />
    </>,
  ),
  'new-goal': full(
    'Pessoa encaixando a última peça de um quebra-cabeça com uma bandeira no topo',
    <>
      <Ground y={188} />
      <Flag x={206} y={50} s={0.95} />
      <Puzzle last={false} x={168} y={100} s={1.1} />
      <FacelessCharacter x={84} y={92} arm={-38} />
      <PuzzlePiece x={124} y={72} s={1.05} rot={-10} fill={C.warm} />
    </>,
    1,
  ),
  'summary-ready': full(
    'Envelope aberto com um documento e pequenas estrelas',
    <>
      <Envelope open badge x={104} y={110} s={1.15} />
      <Stars pts={[[238, 74, 8]]} />
      <Stars pts={[[254, 110, 5]]} fill={C.warm} />
      <Stars pts={[[82, 86, 6]]} fill={C.teal} />
    </>,
  ),
  'year-retro': full(
    'Calendário com uma estrela, um troféu e confetes',
    <>
      {confetti}
      <Ground />
      <Calendar x={84} y={78} s={1.2} marks={[1, 6, 8]} />
      <StarBadge x={196} y={96} r={20} />
      <Trophy x={212} y={134} />
    </>,
    1,
  ),
  'areas-empty': full(
    'Quatro ladrilhos com ícones de coração, carteira, livro e pasta, e um botão de adicionar',
    <>
      <Tile x={92} y={50}>
        <Heart x={14} y={15} s={0.8} fill={C.primary} />
      </Tile>
      <Tile x={162} y={50}>
        <rect x="14" y="20" width="32" height="22" rx="5" fill={C.warm} />
        <rect x="34" y="27" width="12" height="8" rx="4" fill={C.paper} />
      </Tile>
      <Tile x={92} y={120}>
        <rect x="16" y="15" width="28" height="30" rx="4" fill={C.teal} />
        <rect x="21" y="22" width="14" height="3" rx="1.5" fill={C.paper} />
      </Tile>
      <Tile x={162} y={120}>
        <path d="M23 22v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" fill="none" stroke={C.navy} strokeWidth="3.5" />
        <rect x="13" y="22" width="34" height="22" rx="5" fill={C.navy} />
      </Tile>
      <circle cx="240" cy="184" r="18" fill={C.primary} />
      <PlusSign x={240} y={184} r={8} fill={C.paper} />
    </>,
  ),
  'all-done': full(
    'Sol sorrindo ao lado de um cartão com todas as tarefas marcadas',
    <>
      {confetti}
      <Checklist x={170} y={84} rows={3} checked={3} s={1.05} />
      <Sun x={122} y={118} r={34} face />
    </>,
  ),
  'limit-reached': full('Bandeja cheia e arrumada, com alguns itens descansando numa prateleira marcada Depois', shelfArt, 1),
  error: full(
    'Um plugue fora da tomada',
    <>
      <path d="M96 120c-28 0-24 52-60 52" fill="none" stroke={C.navy} strokeWidth="5" strokeLinecap="round" />
      <rect x="96" y="107" width="34" height="26" rx="7" fill={C.navy} />
      <rect x="130" y="112" width="13" height="4" rx="2" fill={C.navy} />
      <rect x="130" y="124" width="13" height="4" rx="2" fill={C.navy} />
      <rect x="192" y="92" width="56" height="56" rx="12" fill={C.paper} />
      <circle cx="211" cy="120" r="4" fill={C.navy} />
      <circle cx="229" cy="120" r="4" fill={C.navy} />
      <Stars pts={[[166, 96, 6]]} fill={C.warm} />
      <Stars pts={[[170, 142, 4]]} fill={C.teal} />
    </>,
  ),
  offline: full(
    'Uma nuvem com um traço',
    <>
      <Cloud x={104} y={86} s={1.15} />
      <rect x="157" y="62" width="6" height="112" rx="3" transform="rotate(42 160 118)" fill={C.navy} />
      <Dots pts={[[120, 176, 3], [160, 184, 3], [200, 176, 3]]} fill={C.teal} />
    </>,
    1,
  ),
  'not-found': full(
    'Uma bússola e uma pequena bandeira',
    <>
      <Ground />
      <Compass x={150} y={122} r={46} />
      <Flag x={232} y={138} />
      <Dots pts={[[76, 150, 3], [92, 136, 3], [104, 120, 3]]} fill={C.teal} />
    </>,
  ),

  // ---------- Boas-vindas ----------
  'onboarding-goals': full(
    'Alvo com flecha e peças de quebra-cabeça',
    <>
      <Ground />
      <Flag x={60} y={138} />
      <Target x={130} y={122} r={52} arrow />
      <Puzzle x={196} y={122} s={0.88} />
      <Stars pts={[[244, 70, 7]]} fill={C.warm} />
    </>,
  ),
  'onboarding-routine': full(
    'Calendário e uma lista de tarefas marcadas',
    <>
      <Ground />
      <CoffeeCup x={30} y={150} />
      <Calendar x={72} y={74} s={1.2} marks={[2, 5]} />
      <Checklist x={176} y={80} s={1.05} />
      <Sun x={252} y={58} r={13} />
    </>,
    1,
  ),
  'onboarding-journal': full(
    'Caderno aberto e um envelope',
    <>
      <Ground />
      <Notebook open x={58} y={98} s={1.05} />
      <Envelope x={186} y={112} s={0.84} />
      <Pen x={182} y={62} rot={30} />
      <Stars pts={[[252, 82, 7]]} />
      <Stars pts={[[92, 72, 5]]} fill={C.warm} />
    </>,
  ),

  // ---------- Abertura e fechamento ----------
  'step-tasks': full(
    'Lista de tarefas com uma planta e uma xícara',
    <>
      <Ground />
      <CoffeeCup x={56} y={150} />
      <Checklist x={114} y={86} s={1.08} />
      <Plant x={222} y={128} />
    </>,
  ),
  'step-journal': full('Caderno aberto com uma caneta', journalArt, 1),

  // ---------- Retrospectiva ----------
  'retro-start': full(
    'Um broto, uma bandeira e os primeiros degraus',
    <>
      <Ground />
      <Steps x={150} y={150} n={4} />
      <Flag x={202} y={98} />
      <Plant x={82} y={128} />
      <Stars pts={[[244, 84, 7]]} fill={C.warm} />
    </>,
  ),
  'retro-areas': full(
    'Quebra-cabeça completo',
    <>
      <Puzzle x={112} y={74} s={1.25} />
      <Stars pts={[[238, 86, 8]]} />
      <Stars pts={[[86, 80, 5]]} fill={C.warm} />
    </>,
    1,
  ),
  'retro-mood': full(
    'Sol, nuvem e lua lado a lado',
    <>
      <Sun x={96} y={118} r={24} face />
      <Cloud x={132} y={104} s={0.8} />
      <Moon x={236} y={118} r={24} />
      <Stars pts={[[262, 82, 5]]} fill={C.warm} />
    </>,
  ),
  'retro-later': full('Itens descansando numa prateleira marcada Depois', shelfArt, 0),
  'retro-letter': full(
    'Envelope fechado, uma caneta e um coração',
    <>
      <Envelope x={98} y={78} s={1.2} />
      <Pen x={238} y={84} rot={28} />
      <Heart x={84} y={72} s={0.9} />
      <Stars pts={[[232, 66, 6]]} fill={C.teal} />
    </>,
    1,
  ),
  'retro-final': full(
    'Troféu com estrelas e confetes',
    <>
      {confetti}
      <Ground />
      <Trophy x={120} y={92} s={1.75} />
      <Stars pts={[[232, 110, 8]]} />
    </>,
  ),

  // ---------- Estados de carregamento ----------
  generating: {
    label: 'Envelope e engrenagem em movimento',
    box: [160, 120],
    art: (
      <>
        <G x={20} y={0} s={1}>
          <path
            d="M12 62c-3-26 14-46 38-50 16-3 26 4 40 4 14 1 22 14 22 34 0 22-8 44-28 52-16 7-28 0-42 0-16 0-28-18-30-40Z"
            fill={C.soft}
          />
        </G>
        <Envelope x={38} y={26} s={0.78} className="ill-bounce" />
        <Gear x={118} y={86} r={13} className="ill-spin" />
        <Star x={128} y={36} r={6} fill={C.warm} />
        <PlusSign x={24} y={92} />
      </>
    ),
  },
  sparkle: {
    label: 'Brilhos sobre uma mancha suave',
    box: [320, 96],
    art: (
      <>
        <path
          d="M70 52c-4-24 22-40 56-42 28-2 44 6 72 4 34-2 56 12 56 36 0 22-22 36-52 38-26 2-44-4-70-2-32 2-58-10-62-34Z"
          fill={C.soft}
        />
        <Star x={160} y={48} r={18} />
        <Star x={196} y={30} r={7} fill={C.warm} />
        <Star x={126} y={66} r={6} fill={C.teal} />
        <Dots pts={[[96, 36, 3], [226, 64, 3]]} />
        <PlusSign x={52} y={30} />
        <PlusSign x={270} y={66} fill={C.warm} />
      </>
    ),
  },

  // ---------- Módulos ----------
  'fitness-module': full(
    'Balança, halter e um gráfico de evolução',
    <>
      <Ground />
      <Scale x={48} y={126} />
      <Dumbbell x={132} y={152} s={1.15} />
      <ChartCard x={172} y={52} s={0.9} />
      <Heart x={92} y={70} s={0.8} />
      <Stars pts={[[150, 96, 6]]} fill={C.warm} />
    </>,
  ),
  'study-module': full(
    'Livro aberto, relógio e um selo de acerto',
    <>
      <Ground />
      <Plant x={44} y={128} />
      <Book x={90} y={96} s={1.02} />
      <Clock x={248} y={86} r={24} />
      <CheckBadge x={244} y={160} r={16} />
      <Stars pts={[[120, 66, 6]]} fill={C.warm} />
    </>,
    1,
  ),

  // ---------- Por tipo de métrica ----------
  'metric-frequency': spot(
    'Halter e calendário',
    <>
      <Calendar x={20} y={18} s={0.72} marks={[0, 2, 5]} />
      <Dumbbell x={34} y={78} s={0.9} rot={-10} />
    </>,
  ),
  'metric-sum': spot(
    'Cofrinho e moedas',
    <>
      <PiggyBank x={16} y={30} />
      <Coins x={66} y={74} n={3} s={0.85} />
    </>,
  ),
  'metric-value': spot(
    'Balança e linha de evolução',
    <>
      <Scale x={12} y={46} s={0.9} />
      <path d="M56 42l14-6 12 4 22-20" fill="none" stroke={C.navy} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="104" cy="20" r="5" fill={C.warm} />
    </>,
  ),
  'metric-milestones': spot(
    'Bandeira no alto de degraus',
    <>
      <Steps x={24} y={62} n={4} />
      <Flag x={78} y={12} s={0.96} />
    </>,
  ),
  'metric-days': spot(
    'Livro aberto e relógio',
    <>
      <Book x={10} y={42} s={0.66} />
      <Clock x={90} y={38} r={17} />
    </>,
  ),

  // ---------- Ícones que a pessoa escolhe para a meta ----------
  'goal-target': spot('Alvo com flecha', <Target x={56} y={62} r={30} arrow />),
  'goal-heart': spot(
    'Coração',
    <>
      <Heart x={30} y={36} s={1.5} />
      <Star x={98} y={34} r={6} fill={C.primary} />
    </>,
  ),
  'goal-plant': spot('Planta num vaso', <Plant x={34} y={22} s={1.3} />),
  'goal-trophy': spot('Troféu', <Trophy x={30} y={28} s={1.15} />),
  'goal-mountain': spot(
    'Montanha com bandeira no topo',
    <>
      <Mountain x={15} y={42} s={0.6} />
      <Flag x={74} y={18} s={0.55} />
    </>,
  ),
  'goal-compass': spot('Bússola', <Compass x={60} y={60} r={30} />),
  'goal-run': spot('Pessoa acenando', <FacelessCharacter x={38} y={16} s={0.85} arm={-50} jacket={C.teal} />),
  'goal-coffee': spot('Xícara de café', <CoffeeCup x={28} y={36} s={1.4} />),
  'goal-sun': spot('Sol sorrindo', <Sun x={60} y={60} r={21} face />, true),
  'goal-moon': spot(
    'Lua e estrelas',
    <>
      <Moon x={62} y={60} r={28} />
      <Stars pts={[[30, 40, 6], [94, 84, 5]]} fill={C.warm} />
    </>,
    true,
  ),
  'goal-notebook': spot(
    'Caderno e caneta',
    <>
      <Notebook x={26} y={22} s={0.8} />
      <Pen x={88} y={30} rot={20} s={0.9} />
    </>,
  ),
  'goal-puzzle': spot('Quebra-cabeça', <Puzzle x={28} y={32} s={0.85} />),
  'goal-leaf': spot(
    'Folhas',
    <>
      <Leaf x={30} y={36} s={1.3} rot={-20} />
      <Leaf x={62} y={30} s={1.15} rot={18} fill={C.primary} />
    </>,
  ),
  'goal-cloud': spot(
    'Nuvem e sol',
    <>
      <Sun x={74} y={42} r={16} />
      <Cloud x={14} y={46} s={0.85} />
    </>,
  ),
  'goal-shield': spot('Escudo com sinal de certo', <Shield x={30} y={26} s={1.4} />),

  // ---------- Passos da nova meta ----------
  'wizard-specific': spot(
    'Lupa sobre um alvo',
    <>
      <Target x={52} y={64} r={32} />
      <Magnifier x={80} y={50} r={18} />
    </>,
  ),
  'wizard-measurable': spot(
    'Régua e gráfico de barras',
    <>
      <ChartCard bars x={16} y={22} s={0.72} />
      <Ruler x={26} y={92} s={0.85} rot={-8} />
    </>,
  ),
  'wizard-achievable': spot(
    'Montanha com degraus e bandeira no topo',
    <>
      <Flag x={75} y={12} s={0.5} />
      <Mountain x={10} y={32} s={0.66} />
      <Steps x={16} y={76} n={3} s={0.66} />
    </>,
  ),
  'wizard-relevant': spot(
    'Coração e bússola',
    <>
      <Heart x={18} y={30} s={1.3} />
      <Compass x={82} y={76} r={21} />
    </>,
  ),
  'wizard-deadline': spot(
    'Calendário e relógio',
    <>
      <Calendar x={14} y={18} s={0.76} marks={[10]} />
      <Clock x={88} y={84} r={19} rim={C.warm} />
    </>,
  ),

  // ---------- Seções de configurações (redondas) ----------
  'settings-healthy-mode': spot(
    'Folha e coração',
    <>
      <Leaf x={26} y={32} s={1.3} rot={-18} />
      <Heart x={60} y={52} s={1} />
    </>,
    true,
  ),
  'settings-areas': spot('Peças de quebra-cabeça', <Puzzle x={24} y={24} s={0.95} />, true),
  'settings-summaries': spot(
    'Envelope e estrelas',
    <>
      <Envelope x={18} y={26} s={0.84} />
      <Stars pts={[[92, 30, 7]]} fill={C.warm} />
    </>,
    true,
  ),
  'settings-backup': spot(
    'Nuvem e escudo',
    <>
      <Cloud x={12} y={28} />
      <Shield x={62} y={54} s={0.92} />
    </>,
    true,
  ),
  'settings-appearance': spot(
    'Sol e lua',
    <>
      <Sun x={44} y={48} r={16} />
      <Moon x={80} y={78} r={19} />
    </>,
    true,
  ),
  'settings-reminders': spot('Relógio', <Clock x={60} y={60} r={30} />, true),
  'settings-prototype': spot('Engrenagem', <Gear x={60} y={60} r={24} hole={C.paper} />, true),

  // ---------- Miniaturas dos resumos ----------
  'summary-monthly': spot('Calendário do mês', <Calendar x={18} y={18} s={0.88} marks={[5]} />),
  'summary-quarterly': spot('Calendário com três marcações', <Calendar x={18} y={18} s={0.88} marks={[1, 6, 11]} />),
  'summary-annual': spot(
    'Calendário com estrela e troféu',
    <>
      <Calendar x={10} y={14} s={0.8} marks={[3]} />
      <StarBadge x={82} y={30} r={13} />
      <Trophy x={66} y={56} s={0.9} />
    </>,
  ),

  // ---------- Hora do dia ----------
  'time-morning': spot('Sol da manhã', <Sun x={60} y={62} r={24} />),
  'time-afternoon': spot(
    'Sol com nuvem',
    <>
      <Sun x={52} y={50} r={21} />
      <Cloud x={36} y={58} s={0.72} />
    </>,
  ),
  'time-night': spot(
    'Lua e estrelas',
    <>
      <Moon x={56} y={60} r={26} />
      <Stars pts={[[88, 40, 7], [96, 72, 4]]} fill={C.warm} />
    </>,
  ),
} satisfies Record<string, Scene>

export type IllustrationName = keyof typeof SCENES
