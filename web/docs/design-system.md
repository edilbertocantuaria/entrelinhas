# Design system

Calmo, mínimo e sem ansiedade. Formas chapadas, sem sombras pesadas, sem gradientes nos componentes. Uma ação principal por tela.

## Cores

Definidas como variáveis CSS em [`src/app/globals.css`](../src/app/globals.css), com versão clara (`:root`) e escura (`.dark`). O Tailwind lê essas variáveis por `@theme inline`; nos componentes, use **as classes**, nunca o código hexadecimal.

| Token | Classe | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--bg` | `bg-bg` | `#F1F8FB` | `#07202D` | fundo das telas |
| `--surface` | `bg-surface` | `#FFFFFF` | `#0E2E3F` | cartões, campos |
| `--text` | `text-ink` | `#0B2A3F` | `#E4F3FA` | texto principal |
| `--text-muted` | `text-muted` | `#55788C` | `#8DB3C5` | apoio, legendas |
| `--border` | `border-line` | `#D9E9F0` | `#1B445A` | bordas de 0,5 px |
| `--primary` | `bg-primary`, `text-primary` | `#0A74BB` | `#3FA9EC` | ação principal, destaques |
| `--primary-soft` | `bg-primary-soft` | `#D6EAF6` | `#12425E` | chips selecionados, avisos |
| `--on-primary` | `text-on-primary` | branco | `#07202D` | texto sobre `primary` |

- **Cores das áreas:** 10 cores fixas, cada uma com versão clara e escura: verde, mar, tijolo, celeste, periwinkle, azul-cinza, âmbar, lavanda, musgo, areia. São as variáveis `--area-{chave}`, acessadas por `areaColor(chave)` em [`domain/areas.ts`](../src/domain/areas.ts). O ícone da área aparece num círculo com 20% da cor (`AreaIcon`).
- **Cores do ritmo** (`PacePill`): "concluída" em verde (`success` / `success-soft`), "um pouco atrás" em vermelho (`alert` / `alert-soft`), "no ritmo" e "adiantado" no azul da marca (`primary-soft`). O vermelho fica **só** no selo de atraso: falha, exclusão e tarefas não feitas continuam em tons neutros (`text-muted`, borda).
- **Tema:** claro, escuro ou do sistema, pela classe `.dark` no `<html>`. Um script aplica o tema antes da primeira pintura, para a tela não piscar.

## Tipografia

Carregadas por `next/font` em [`layout.tsx`](../src/app/layout.tsx); vão junto com o app e funcionam offline.

| Papel | Fonte | Pesos | Onde |
|---|---|---|---|
| Interface | **Figtree** (`--font-figtree`) | 400, 500 | todo o resto |
| Voz | **Borel** (`--font-voice-face`, classe `.voice`) | só 400 | data de Hoje, diário, títulos e textos dos resumos, retrospectiva, campos de reflexão |

- **Tamanhos:** data do topo 22 px; texto de tarefa 14 px; legendas 12 px; campos 16 px (evita o zoom automático no iPhone).
- **Caixa de frase:** só a primeira letra maiúscula em títulos e botões.
- **Pesos:** só 400 e 500; nada de negrito pesado.
- **Fonte de voz:** só tem peso 400, e o negrito simulado está desligado (`font-synthesis-weight: none`).

## Medidas

| Medida | Valor | Onde |
|---|---|---|
| Raio dos cartões | 12 px | `.card` / `rounded-card` |
| Raio de botões e campos | 10 px | `rounded-ctl` |
| Botões de ícone | círculo de 44 px | `.icon-btn` |
| Borda | 0,5 px | `--border` |
| Área de toque | mínimo 44 px | todo controle |
| Moldura no desktop | 390 px | com borda de celular, a partir de 480 px de largura |

## Componentes base (`src/components/ui`)

| Componente | Arquivo | Uso |
|---|---|---|
| `Button`, `buttonVariants` | [`button.tsx`](../src/components/ui/button.tsx) | variantes `primary` (uma por tela), `outline`, `soft`, `ghost`, `quiet`; tamanhos `default` (48 px), `sm` (44 px), `icon`; `block` ocupa a largura. Em `<Link>`, use `buttonVariants()` na `className`. |
| `Sheet` | [`sheet.tsx`](../src/components/ui/sheet.tsx) | folha que sobe de baixo (Base UI Dialog), presa à moldura; prende o foco, fecha com Esc e toque fora |
| `Switch` | [`controls.tsx`](../src/components/ui/controls.tsx) | interruptor 44 × 26 com a bolinha centralizada |
| `Segmented` | idem | escolha entre 2 a 4 opções (radiogroup) |
| `Stepper` | idem | número com − e + |
| `Chip` | idem | escolha em pílula (filtros, sugestões) |
| `ScrollRow` | idem | fileira com rolagem lateral: toque, arraste com o mouse, roda do mouse e setas nas pontas |
| `Field` | idem | rótulo, campo e dica |
| `ProgressBar` | idem | barra de progresso com `role="progressbar"` |

Componentes compartilhados de tela, em [`common.tsx`](../src/components/common.tsx):

- `AreaIcon`, `AreaChip`, `GoalChip`;
- `PacePill` (ritmo em tom neutro);
- `EmptyState` (ilustração, título, uma frase e uma ação);
- `MoodPicker`, `MoodBadge`;
- `BackButton`, `SectionTitle`;
- `StarBurst`: estrelinhas ao concluir uma tarefa, menos de 1 segundo.

Classes utilitárias de `globals.css`:

- `.card`: superfície, borda 0,5 px, raio 12;
- `.field`: campo de formulário;
- `.icon-btn`: botão de ícone redondo;
- `.voice`: fonte de voz;
- `.fade-in`: entrada suave.

## Ilustrações

Estilo *flat*: formas sólidas e simples, cores vindas das variáveis do tema, o que faz as ilustrações funcionarem no claro e no escuro.

- **Primitivas:** [`illustrations/primitives.tsx`](../src/components/illustrations/primitives.tsx), como `Blob`, `Plant`, `CoffeeCup`, `Calendar`, `Notebook`, `Target`, `Trophy`, `Mountain`, `Dumbbell`, `Clock`, `Cloud`, `FacelessCharacter`…
- **Cenas:** [`illustrations/scenes.tsx`](../src/components/illustrations/scenes.tsx) monta as cenas em dois tamanhos: 320 × 240 (estados vazios, boas-vindas, retrospectiva) e 120 × 120 (ícones de meta, títulos de seção, passos).
- **Uso:** `<Illustration name="goals-empty" />` ([`illustration.tsx`](../src/components/illustration.tsx)).
  - `height`: até 160 px.
  - `level`:
    - `"core"` aparece também com a densidade "Poucas";
    - `"extra"` só aparece com "Muitas";
    - com "Nenhuma", nenhuma ilustração aparece.
  - `decorative`: fica fora da leitura de tela; sem ele, a cena usa o rótulo em português de `SCENES[name].label`.
  - `always`: mostra mesmo com "Nenhuma" (usado no seletor de ícone).
- **Substituir uma cena:** coloque `public/illustrations/{nome}.svg`. A lista desses arquivos é lida no servidor quando o app carrega, e eles passam a valer no lugar da cena.
- **Ícones de meta:** a pessoa escolhe entre 20 (`GOAL_ART` em [`goal-visuals.tsx`](../src/components/goal-visuals.tsx)). Sem escolha, vale o ícone do tipo de medida.
- **Onde não usar:** nunca entre tarefas nem dentro de listas longas.

### Animação

Movimento lento e de pouca amplitude, com uma classe CSS por tipo, nas primitivas:

| Classe | Movimento |
|---|---|
| `ill-twinkle` | estrelas e sinais de +, cada um no seu tempo |
| `ill-sway`, `ill-wave` | planta, folhas, caneta, bandeira |
| `ill-float`, `ill-float-slow` | lua, alvo, troféu, envelope, cofrinho, pontos do fundo |
| `ill-drift` | nuvem, lupa |
| `ill-pulse`, `ill-breathe` | selos, coração; a mancha do fundo |
| `ill-steam` | vapor do café |
| `ill-rays`, `ill-hand`, `ill-gear`, `ill-needle` | raios do sol, ponteiro, engrenagem, agulha da bússola |
| `ill-bar`, `ill-draw` | barras e linha dos gráficos desenhados |
| `ill-enter` | a ilustração entra subindo ao aparecer |
| `esther-blink` | a coruja da Esther pisca |

Com `prefers-reduced-motion: reduce`, toda animação e transição é desligada (regra global no fim de `globals.css`). As amplitudes estão em unidades do desenho: como a arte aparece reduzida (44 a 220 px), movimentos pequenos demais somem.

## Esther

A guia de IA tem nome e avatar próprios em [`esther.tsx`](../src/components/esther.tsx): `ESTHER` (o nome) e `<EstherAvatar size={30} />`, uma coruja com uma pena, no mesmo estilo das ilustrações. Use o avatar em tudo o que for da Esther, nunca o ícone genérico de "IA".

## Texto

- **Língua:** português do Brasil, falando com a pessoa por **você**.
- **Botões:** começam por verbo ("Criar meta", "Registrar", "Fechar o dia").
- **Proibido:** ponto de exclamação, "por favor", "com sucesso", "parabéns".
- **Ritmo:** "no ritmo", "adiantado", "um pouco atrás". O que não avançou "ficou para depois". Dispensar "não conta como falha".
- **Formatos:** dinheiro `R$ 1.234,56` (`brl()`); números `num()` e `num1()`; datas com date-fns em `pt-BR` (`longDay`, `shortDay`, `fmt`), em [`format.ts`](../src/shared/format.ts).
- **Mensagens curtas:** avisos (toast) com uma frase. Erros dizem o que fazer ("Confira o e-mail, parece incompleto").

## Acessibilidade

- **Rótulos:** todo botão só de ícone tem `aria-label` em português.
- **Papéis ARIA:**
  - `role="checkbox"` nas tarefas;
  - `radiogroup` nas escolhas únicas;
  - `aria-current` no dia escolhido;
  - `aria-live` em contadores e prévias.
- **Foco:** contorno visível (`:focus-visible` com `--primary`). As folhas prendem o foco e fecham com Esc.
- **Ilustrações:** as decorativas usam `aria-hidden`; as com significado têm rótulo.
- **Toque:** área mínima de 44 px. Chips e botões já têm 44 px de altura; o `Switch`, de 26 px, ganha área de toque invisível até 44 px (`after:`).
- **Movimento:** respeita "reduzir movimento".
