# Arquitetura

## Stack

| Parte | Escolha |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Estilo | Tailwind CSS 4 (`@theme inline` em `globals.css`), tokens em variáveis CSS |
| Componentes base | Base UI (`@base-ui/react`: Dialog, Switch), no padrão shadcn (`components.json`) |
| Ícones | lucide-react |
| Gráficos | Recharts |
| Datas | date-fns com locale `pt-BR` |
| Estado | Zustand com `persist` em `localStorage` |
| IA | rota de servidor `/api/ia`; OpenAI por HTTP, Anthropic pelo SDK oficial, Gemini por HTTP |
| Banco (futuro) | Prisma + PostgreSQL, modelo pronto em `prisma/schema.prisma`, ainda não ligado |

## Pastas

```
web/
├── docs/                   esta documentação
├── public/                 ícones do PWA, service worker (sw.js), ilustrações substitutas
├── prisma/                 modelo do banco (ainda não usado pelo app)
├── src/
│   ├── app/                rotas (telas) e /api/ia
│   ├── components/
│   │   ├── ui/             Button, Sheet, Switch, Segmented, Stepper, Chip, Field, ScrollRow, ProgressBar
│   │   ├── illustrations/  primitivas e cenas das ilustrações em SVG
│   │   └── *.tsx           casca do app e componentes de tela
│   ├── domain/             regras do negócio (funções puras) e tipos
│   ├── shared/             store, relógio, formatação, utilitários
│   ├── apis/ai/            cliente, montagem de dados e provedores de IA
│   └── utils/prompts/      prompts de cada situação
├── eslint.config.mjs, .prettierrc, tsconfig.json, next.config.mjs, components.json
└── package.json
```

Alias de import: `@/` aponta para `src/` (`@/domain/goals`, `@/shared/store`, `@/components/ui/button`).

### O que vai em cada camada

- **`domain/`** não importa React nem o store. Recebe dados e devolve dados: `progressOf`, `paceOf`, `occursOn`, `periodStats`, `buildSummary`, `parseBackup`... Fácil de testar e de reaproveitar quando houver servidor.
- **`shared/store.ts`** é o único lugar que **muda** dados. As telas leem com `useStore(state => ...)` e chamam ações (`addGoal`, `completeTask`, `addRule`...). As ações usam funções de `domain/`.
- **`components/`** e **`app/`** só montam a interface. Regra nova de negócio vai para `domain/`, não para dentro de uma tela.
- **`apis/ai/`** tem duas metades:
  - `client.ts` e `inputs.ts` rodam **no navegador**: montam os dados e chamam `/api/ia`.
  - `llm.ts` e `providers/` rodam **só no servidor**, onde ficam as chaves.

## Como o app sobe

[`src/app/layout.tsx`](../src/app/layout.tsx) carrega as fontes, aplica o tema antes da primeira pintura (script inline que lê o `localStorage`), lê a lista de SVGs em `public/illustrations/` e envolve tudo no [`AppShell`](../src/components/app-shell.tsx).

O `AppShell`:

1. **Reidrata o store** (`useStore.persist.rehydrate()`, porque o persist usa `skipHydration`). Até terminar, mostra só o estado de carregamento: as telas nunca renderizam com os dados de exemplo antes dos dados reais.
2. Decide o que mostrar: **login** → **boas-vindas** (onboarding) → **app**.
3. Desenha a **moldura de celular** (`.stage` / `.phone`, 390 px em telas largas), a área rolável (`.scroller`), a **barra de abas** (Hoje, Metas, Diário, Ajustes), o aviso de sem conexão e o toast.
4. Roda os efeitos globais:
   - aplicar o tema (claro, escuro ou do sistema);
   - `runSchedule`, que gera resumos e a retrospectiva na data;
   - `ensureOccurrences`, que põe em Hoje as tarefas que se repetem;
   - `useSummaryAI`, que pede à IA o texto de resumos novos;
   - registrar o service worker (só em produção).
5. Expõe pelo contexto `useShell()`: `frame` (onde as folhas são montadas), `scroller` e `toast(texto)`.

Rotas em tela cheia, **sem a barra de abas**: `/abertura`, `/fechamento`, `/metas/nova`, `/metas/ia`, `/retrospectiva`.

## Relógio do app

[`src/shared/time.ts`](../src/shared/time.ts) → `useClock()` devolve `{ now, today, time, part }`.

- **Virada do dia:** o dia só vira no horário de *Ajustes → Virada do dia* (padrão 04:00). Até lá, a madrugada conta como o dia anterior, e a tela Hoje avisa isso.
- **Data simulada:** com *Ajustes → Protótipo → Data simulada* (`settings.demoDate`), o app inteiro passa a usar essa data, mantendo a hora real. Serve para testar virada de mês, resumos e retrospectiva.
- **Atualização:** o relógio recalcula a cada minuto e quando a janela volta ao foco.

Datas circulam como texto `aaaa-mm-dd` (`iso()`, `shift()`, `daysBetween()` em [`format.ts`](../src/shared/format.ts)), o que evita problemas de fuso.

## Parâmetros de URL

Telas que leem a URL usam `useSearchParams()` dentro de `<Suspense>`. Não use `window.location` para isso: durante a navegação do Next, ele ainda mostra a página anterior, e a tela abre com o parâmetro errado. Veja a [lista de parâmetros](./telas.md#parâmetros-de-url).

## PWA e uso offline

- **Manifesto:** [`src/app/manifest.ts`](../src/app/manifest.ts) gera `/manifest.webmanifest`, com nome, cores, ícones (inclusive o adaptável do Android) e atalhos para Hoje, Metas e Diário.
- **Service worker:** [`public/sw.js`](../public/sw.js) guarda as telas principais e os arquivos estáticos.
  - **Estratégia:** cache primeiro para `/_next/static`, ícones e ilustrações; internet primeiro para o resto.
  - **Limites:** nunca guarda `/api`. Só é registrado em produção (`next start` ou deploy), nunca no `pnpm dev`.
  - **Ao mudar o arquivo:** suba a constante `VERSAO`, para trocar o cache antigo.
- **Cabeçalhos:** [`next.config.mjs`](../next.config.mjs) manda `no-cache` para `sw.js` e para o manifesto.
- **Dados offline:** como os dados ficam no `localStorage`, o app funciona sem internet depois da primeira visita. Só a IA precisa de conexão.
- **APK:** gerado pelo PWABuilder a partir do site publicado. Veja [Desenvolvimento](./desenvolvimento.md#apk-android).
