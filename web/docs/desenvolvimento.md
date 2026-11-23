# Desenvolvimento

## Scripts

Rode tudo dentro de `web/`, com o pnpm (`npx pnpm@12.3.4 <script>` se o pnpm não estiver instalado):

| Script | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento em `http://localhost:3000` |
| `pnpm build` / `pnpm start` | build de produção e servidor de produção (testa o PWA e o service worker) |
| `pnpm lint` | ESLint em `src/`, com **zero avisos** tolerados |
| `pnpm lint:fix` | corrige o que der automaticamente |
| `pnpm format` / `pnpm format:check` | Prettier: formata ou só confere |
| `pnpm typecheck` | `tsc --noEmit` |

Antes de subir uma mudança: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build`.

> O `next.config.mjs` tem `typescript.ignoreBuildErrors: true`: o build **não** para por erro de tipo. Por isso o `pnpm typecheck` é obrigatório.

## Dependências

Use sempre o **pnpm** (`pnpm add <pacote>`, `pnpm add -D <pacote>`). A Vercel instala com `--frozen-lockfile`: um pacote instalado com npm deixa o `pnpm-lock.yaml` desatualizado e o deploy falha com `ERR_PNPM_OUTDATED_LOCKFILE`. Para conferir: `pnpm install --frozen-lockfile --lockfile-only`.

## Lint e formatação

- **[`eslint.config.mjs`](../eslint.config.mjs)** tem a base do Next (`core-web-vitals` e `typescript`), mais as regras herdadas do projeto de referência:
  - Prettier como aviso;
  - import não usado como erro (`unused-imports`);
  - linha em branco depois dos imports;
  - `console` só com `warn` e `error`;
  - regras de React desligadas: `prop-types`, `jsx-no-target-blank`, `no-unescaped-entities`.
- **Variáveis não usadas:** são aviso; nomes começando com `_` são permitidos.
- **[`.prettierrc`](../.prettierrc):** aspas simples, sem ponto e vírgula, vírgula final, `arrowParens: avoid`, largura 160.
- **Duas regras do Next/React que já pegaram código aqui:**
  - **Nada de variável chamada `module`** (`@next/next/no-assign-module-variable`). Use `mod`.
  - **Não leia `ref.current` durante a renderização** nem crie componente dentro de outro (`react-hooks/refs`, `react-hooks/static-components`). Use estado ou `createElement`.

## Convenções

- **Camadas:** regra de negócio vai em `src/domain/` (funções puras); só o `src/shared/store.ts` muda dados; telas e componentes só desenham. Veja [Arquitetura](./arquitetura.md).
- **Imports:** pelo alias `@/` (`@/domain/goals`, `@/shared/format`), não por caminhos relativos longos.
- **Datas:** texto `aaaa-mm-dd`, com os ajudantes de [`format.ts`](../src/shared/format.ts) (`iso`, `shift`, `daysBetween`, `mondayOf`). "Hoje" vem do `useClock()`, nunca de `new Date()` direto: respeita a virada do dia e a data simulada.
- **Parâmetros de URL:** `useSearchParams()` dentro de `<Suspense>`, nunca `window.location`.
- **Texto da interface e comentários em português.** Siga o [tom](./design-system.md#texto): sem exclamação, sem "por favor", ritmo em palavras neutras.
- **Cores e medidas:** só por tokens (`bg-surface`, `text-muted`, `rounded-ctl`…), nunca hexadecimal no componente.
- **Ícones:** lucide-react, 20 px e traço 1,75 nas ações. Ilustração e avatar da Esther pelos componentes próprios.

## Como fazer

### Uma tela nova

1. Crie `src/app/<rota>/page.tsx` com `'use client'`.
2. Leia do store com seletores. Se a rota tiver parâmetro, use `useSearchParams()` em `<Suspense>`.
3. Use `TopBar` e `BackButton` no topo, e `Missing` se o item da rota não existir.
4. Tela em tela cheia, sem abas: acrescente o prefixo em `FULLSCREEN` em [`app-shell.tsx`](../src/components/app-shell.tsx).
5. Para a rota acender uma aba, ajuste o `match` em `TABS`.

### Um campo novo nos dados

1. Acrescente o campo em [`domain/types.ts`](../src/domain/types.ts) (opcional, `?`, se dados antigos não o tiverem).
2. Ponha o valor inicial em [`domain/seed.ts`](../src/domain/seed.ts).
3. Crie ou ajuste as ações em [`shared/store.ts`](../src/shared/store.ts).
4. Inclua no backup ([`domain/backup.ts`](../src/domain/backup.ts)): listas em `LIST_KEYS`, objetos em `OBJECT_KEYS`.
5. Espelhe em [`prisma/schema.prisma`](../prisma/schema.prisma).

### Uma ilustração nova

Monte a cena em [`illustrations/scenes.tsx`](../src/components/illustrations/scenes.tsx) com as primitivas, com `full()` (320 × 240) ou `spot()` (120 × 120) e um rótulo em português. O nome passa a valer em `<Illustration name="..." />`. Animações: use as classes `ill-*` (veja o [design system](./design-system.md#animação)).

### Um prompt ou uma IA nova

Veja [IA e Esther](./ia-e-esther.md#prompts).

## Testar à mão

- **Dados limpos:** "Limpar todas as metas" (Começar do zero) ou "Restaurar dados de exemplo", em Ajustes.
- **Datas:** *Ajustes → Protótipo → Data simulada* para testar virada de mês, resumos (dia 1º), "Gerar agora" (3 últimos dias do mês) e retrospectiva (24/12/2026).
- **Tema e densidade:** claro, escuro, ilustrações em "Poucas" e "Nenhuma".
- **Movimento:** "reduzir movimento" do sistema; as animações devem parar.
- **Offline:** em produção (`pnpm build && pnpm start`), abra, desligue a internet e recarregue.
- **IA:** `GET /api/ia` mostra se há chave e qual IA é usada.

## Deploy (Vercel)

- **Diretório:** *Root Directory* do projeto na Vercel = **`web`**.
- **Instalação:** pelo `packageManager` do `package.json` (pnpm 12.3.4), com lockfile congelado.
- **Variáveis:** as mesmas do `.env.example`, configuradas na Vercel. Lembre que `/api/ia` ainda não exige login (veja [IA e Esther](./ia-e-esther.md#fluxo)).

## APK (Android)

O app é um PWA instalável. Para gerar o APK:

1. Publique o site (Vercel).
2. Abra o [PWABuilder](https://www.pwabuilder.com), cole o endereço, e o relatório deve passar no manifesto e no service worker.
3. **Package For Stores → Android.**
4. Guarde o arquivo de assinatura (`signing.keystore`) e as senhas: sem eles, não dá para atualizar o app depois.
5. Coloque o `assetlinks.json` que vem no pacote em `public/.well-known/assetlinks.json` e publique de novo. Sem ele, o app abre com a barra de endereço no topo.
