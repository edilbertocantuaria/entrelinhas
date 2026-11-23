# IA e Esther

A IA aparece em dois lugares hoje:

1. **Resumos do mês e do trimestre:** o texto é escrito pela IA quando *Ajustes → Usar IA nos resumos* está ligado.
2. **Esther:** a guia que ajuda a criar e ajustar metas, em `/metas/ia`.

Mais oito situações têm prompt pronto, mas ainda não estão ligadas a nenhuma tela (veja a tabela de prompts).

## Fluxo

```
tela (navegador)                      servidor                         provedor
────────────────                      ────────                         ────────
inputs.ts monta os dados  ─┐
client.ts askAI(prompt,    │  POST /api/ia                llm.ts escolhe a IA
          entrada) ────────┴──────────────────────────▶   (rota, principal, reservas)
                                     route.ts monta o      ──▶ providers/openai.ts
                                     prompt (utils/prompts)    providers/anthropic.ts
                                     e valida a resposta  ◀──  providers/gemini.ts
          ◀────────────── { data, provider, model } ────
```

- **As chaves nunca vão para o navegador.** Só [`src/app/api/ia/route.ts`](../src/app/api/ia/route.ts) e [`src/apis/ai/llm.ts`](../src/apis/ai/llm.ts) leem o `.env`.
- **`POST /api/ia`:**
  - recebe `{ "prompt": "<id>", "entrada": { ... } }`;
  - aceita só chamadas do próprio site (confere a origem) e corpo de até 120 KB;
  - responde `{ data }` já validado, ou um erro: 400 (pedido ruim), 502 (a IA respondeu errado), 503 (sem chave), 504 (demorou).
- **`GET /api/ia`:** mostra quais IAs têm chave e em que ordem são tentadas, sem revelar as chaves.
- **Proteção ainda insuficiente:** a rota pública ainda **não exige login**. Antes de divulgar o app, ela precisa conferir a sessão, senão qualquer pessoa pode gastar a chave.

## Configuração (`.env`)

Modelo em [`.env.example`](../.env.example). Só a chave é obrigatória.

| Variável | Para que serve |
|---|---|
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | chaves; uma IA sem chave é pulada |
| `LLM_PROVIDER` | IA principal: `openai`, `anthropic` ou `gemini` |
| `LLM_MODEL` | modelo da IA principal (vazio = o padrão do adaptador) |
| `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `GEMINI_MODEL` | modelo de cada IA quando ela entra como reserva ou por rota |
| `LLM_FALLBACK` | reservas em ordem, ex.: `anthropic,gemini`; usadas se a principal cair, demorar ou atingir o limite de uso |
| `LLM_ROUTES` | IA por situação, ex.: `resumo-trimestral=anthropic,estudos-insights=gemini` |

Padrões dos adaptadores: `gpt-4.1-mini` (OpenAI), `claude-opus-5-5` (Anthropic), `gemini-2.5-flash` (Gemini).

## Provedores

Pasta [`src/apis/ai/providers/`](../src/apis/ai/providers/). Cada provedor segue o contrato `Provider` de [`types.ts`](../src/apis/ai/types.ts): recebe `{ system, user, maxTokens }` e devolve o texto.

| Provedor | Como chama |
|---|---|
| `openai` | HTTP, Chat Completions em modo JSON |
| `anthropic` | SDK oficial (`@anthropic-ai/sdk`) |
| `gemini` | HTTP, `generateContent` com resposta JSON; a chave vai no cabeçalho |

Detalhes do provedor `anthropic`:

- **Esforço:** `effort: 'low'`, que basta para textos curtos.
- **Recusa:** liga `fallbacks: 'default'`, para a própria API tentar outro modelo Claude se o pedido for recusado por política.
- **Respostas incompletas:** trata `refusal` e `max_tokens` como erro.

**Adicionar uma IA nova:** crie o arquivo na pasta seguindo o `openai.ts`, registre em `providers/index.ts` e ponha a chave no `.env`. Os prompts não mudam.

## Prompts

Pasta [`src/utils/prompts/`](../src/utils/prompts/), um arquivo por situação.

- **Formato de cada prompt** (`PromptDef`):
  - `id`;
  - `quando` (em que momento do app é usado);
  - `system` (instruções fixas);
  - `user(entrada)` (monta a mensagem com os dados);
  - `maxTokens`;
  - `parse(json)` (valida a resposta e devolve `null` se não servir).
- **Formato da resposta:** todos pedem a resposta em JSON. A rota tolera um bloco de código em volta.
- **Tom comum:** [`tom.ts`](../src/utils/prompts/tom.ts) entra em todos.
  - português do Brasil, "você";
  - sem exclamação;
  - ritmo neutro;
  - não inventar dados;
  - valores com centavos;
  - não generalizar ("todos os dias") sem base;
  - sem conselho médico, financeiro ou psicológico.

| Prompt | Quando | Ligado? |
|---|---|---|
| `resumo-mensal` | resumo do mês (automático, "Gerar agora", "Gerar de novo") | sim |
| `resumo-trimestral` | resumo do trimestre | sim |
| `meta-chat` | conversa com a Esther (criar e ajustar meta) | sim |
| `retrospectiva-anual` | textos dos cartões e rascunho da carta | não |
| `perguntas-reflexao` | perguntas de "Para o próximo período" | não |
| `meta-smart` | ajuda pontual para detalhar uma meta | não |
| `plano-do-dia` | sugestão de tarefas na abertura | não |
| `pergunta-diario` | pergunta para começar a escrever no fechamento | não |
| `estudos-insights` | leitura das anotações de estudo | não |
| `fitness-progresso` | texto sobre os treinos | não |
| `modulo-resumo` | resumo de um módulo criado | não |

**Adicionar um prompt:** crie o arquivo com o `PromptDef`, registre em `utils/prompts/index.ts` (`PROMPTS`) e chame com `askAI('<id>', entrada)` em [`apis/ai/client.ts`](../src/apis/ai/client.ts). Os tipos de entrada e saída saem do próprio `PromptDef` (`EntradaDe<'id'>`, `SaidaDe<'id'>`).

## Resumos com IA

[`src/components/summary-ai.tsx`](../src/components/summary-ai.tsx) e [`src/apis/ai/inputs.ts`](../src/apis/ai/inputs.ts):

- **O que vai para a IA:** `periodInput()` envia só o necessário: o período, as entradas do diário (cortadas), a média de humor, a contagem de tarefas, as metas que avançaram (com o ritmo) e as paradas, e uma linha por módulo.
- **Gerar de novo:** manda também o texto anterior, pedindo outra abertura e outras palavras.
- **Se a IA falhar:** o resumo fica com a versão só com números, marcada "sem IA".

## Chat da Esther

Tela: [`src/app/metas/ia/page.tsx`](../src/app/metas/ia/page.tsx). Prompt: [`meta-chat.ts`](../src/utils/prompts/meta-chat.ts). Conversão: [`domain/goal-draft.ts`](../src/domain/goal-draft.ts).

**Como ela conduz a conversa.** O papel da Esther é **investigar** até a meta ser da pessoa, e não entregar uma meta pronta a partir de duas palavras. Ela segue o roteiro SMART (Específica, Mensurável, Alcançável, Relevante, Prazo):

- uma pergunta por vez, devolvendo o que entendeu;
- opções concretas ("mais perto de 2, 3 ou 4 vezes?");
- não pergunta título, área, nome da tarefa nem dias da semana: escolhe ela mesma, e a pessoa ajusta na revisão.

**O que ela sabe propor:**
- **Prazo:** uma data ou um marco em texto (`ate`, ex.: "passar no concurso"). Com marco, a data é opcional. Marcos ligados a outra meta do app só pelo "Editar campos".
- **Frequência:** por semana, mês, bimestre, trimestre ou ano (`periodo`), contando vezes, horas (`contarEm: "horas"`) ou dias e horas (`contarEm: "diasEHoras"` + `horas.modo`: `porDia`, `total` ou `referencia`).
- **Duração da sessão** (metas de dias): só quando a pessoa falou.
- O prompt explica como o app mede o ritmo (mínimo, máximo, regra dos 3 em 4 períodos…), para ela propor números que caibam numa semana difícil.

**No ajuste, ela recebe como a meta está indo** (`goalSummary` com progresso e ritmo): progresso atual, ritmo com a explicação, "para ficar no ritmo" (quando está atrás) e se a meta já foi concluída. Se a meta está atrás, ela oferece os dois caminhos (manter o combinado com o próximo passo, ou deixá-lo mais leve) sem linguagem de falha. Se a pessoa diz que o marco aconteceu, ela indica o botão "Marco atingido" em vez de propor ajuste.

**O que cada resposta traz:**
- `resposta`: a mensagem;
- `smart`: o que já ficou firmado em cada ponto, que aparece na faixa ✓ no topo;
- `sugestoes`: até 3 respostas para tocar;
- `meta`: a proposta, ou `null` enquanto pergunta;
- `mudancas`: no ajuste, os campos que ela mudou de propósito.

**Proteções feitas pelo app** (o modelo nem sempre obedece):

- **Pontos firmados não se perdem:** o app mantém o que já tinha sido firmado mesmo se a resposta seguinte esquecer, e manda essa lista de volta ("não pergunte de novo").
- **Pedido de montar:** quando a pessoa pede ("pode montar", "fechado"…), o app manda `proporAgora` e, se a proposta não vier, pede uma segunda vez. Depois de duas respostas, aparece o atalho "Pode montar".
- **No ajuste, só muda o necessário** (`onlyChanged`):
  - campos estruturais (medida, prazo, dias, lembrete, área) só entram se mudaram de fato;
  - "Específica" e "Alcançável" acompanham quando a medida ou o prazo mudam;
  - título, motivo, ponto de partida e nome da tarefa ficam como estavam, a menos que a Esther liste a mudança.
- **Proposta convertida e conferida** (`fromProposal`): área existente, prazo futuro, medida válida com valores seguros, datas escritas por extenso.

**Revisão e autorização:**
- **Criar:** "Criar esta meta" cria a meta e a repetição.
- **Ajustar:** a revisão mostra o que **mudou**, com o valor antigo riscado. "Salvar alterações" mantém os registros, as etapas concluídas (pelo nome, em `keepMilestoneIds`) e o início da meta.
- **Editar campos:** salva o rascunho na aba (`sessionStorage`) e abre o passo a passo preenchido.
- **Conversa guardada:** fica na aba enquanto ela estiver aberta, uma por meta, e sai ao criar ou salvar.

**Sem IA configurada:** o chat avisa e oferece o passo a passo.
