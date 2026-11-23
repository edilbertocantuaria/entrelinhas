# Regras do produto

Como o app se comporta. As regras ficam em `src/domain/`, em funções puras; as telas só as chamam.

O princípio de tudo: **ritmo possível, sem culpa**. O que não avançou "ficou para depois"; pausas e dispensas não contam contra a pessoa; nada usa linguagem de falha. O único vermelho é o selo "um pouco atrás" do ritmo; "concluída" é verde.

## Metas

Arquivo principal: [`domain/goals.ts`](../src/domain/goals.ts). Cada meta tem os campos SMART (específica, medida, ponto de partida e por que é alcançável, por que importa, prazo), uma área, a tarefa do dia, um lembrete e um ícone opcional.

### Tipos de medida (`Metric`)

| Tipo | Exemplo | Progresso |
|---|---|---|
| `frequency` | academia 3 a 4x por semana; estudar 20 a 30 horas por mês | no período atual (semana, mês, bimestre, trimestre ou ano; `period`, padrão semana): **dias** com registro (dois treinos no mesmo dia contam 1), **horas** somadas (`count: 'horas'`) ou **dias e horas** (`count: 'dias-horas'`, com `hours.rule` à escolha: `per-day` = o dia só conta com o mínimo de horas; `total` = dias e total de horas lado a lado, atrás se qualquer um estiver; `reference` = qualquer dia conta, horas só como referência). Períodos em [`domain/periods.ts`](../src/domain/periods.ts) |
| `sum` | guardar R$ 5.000,00 | soma dos valores até o alvo |
| `value` | peso de 85 para 78 kg | última medição, entre o valor inicial e o alvo |
| `milestones` | projeto em 5 etapas | etapas concluídas |
| `days` | estudar em 60 dias (ou 50 horas) | dias com registro (ou horas somadas) |

### Até quando a meta vale: data ou marco (`until`)

Uma meta termina numa **data** (`deadline`) ou num **marco** (`until`), quando vale "até algo acontecer":

- **Acontecimento** (`{ type: 'event', text }`): ex.: "até passar no concurso". A pessoa toca em **Marco atingido** na página da meta, e a data fica em `reachedOn`. Dá para desfazer.
- **Outra meta** (`{ type: 'goal', goalId }`): ex.: academia 3x por semana até concluir "Chegar a 78 kg". A meta termina sozinha no dia em que a outra chega a 100% (`finishedOn`). Metas de frequência não servem de marco, porque não terminam sozinhas, e um marco nunca pode voltar à própria meta (`marcoCandidates`).
- **Data opcional:** com marco, `deadline` é só uma estimativa para o ritmo; sem ela, metas que não são de frequência mostram o progresso sem comparar com o tempo.
- **Ao chegar ao marco** (`isActiveOn`), a meta fica **concluída**: progresso cheio, ritmo "concluída" e registro desativado. As tarefas pendentes dela saem da agenda (Hoje, outros dias e Depois, em `ensureOccurrences`); as feitas ficam no histórico. Param as sugestões e as ocorrências da repetição, que não é apagada: ao desfazer o marco, ela volta. A repetição de uma meta com marco não tem data final (`repeatEndFor`).
- **Meta usada como marco excluída:** quem dependia dela passa a ter o marco em texto ("concluir “…”"), já atingido se ela tinha terminado.

### Ritmo (`paceOf`)

Rótulos sempre neutros: **no ritmo**, **adiantado**, **um pouco atrás**, **concluída**.

- **Frequência** (`frequencyPace`): olha os últimos períodos completos (4 semanas, 3 meses, 2 bimestres ou trimestres, 1 ano).
  - Média ≥ máximo: adiantado.
  - Combinado cumprido em ≥ 75% dos períodos **ou** média ≥ 90% do mínimo: no ritmo. (Antes só valia a primeira regra, e uma média igual ao combinado podia aparecer como "um pouco atrás".)
  - Senão: um pouco atrás.
  - O primeiro período, se a meta começou no meio dele, cobra só a parte proporcional e só entra na média se a meta valeu pelo menos metade dele.
  - O período atual só conta a favor: entra quando já chegou ao mínimo.
  - Sem período completo ainda: a primeira semana é sempre "no ritmo"; nos períodos longos, compara com o esperado até hoje.
  - Tarefas **dispensadas** reduzem o combinado daquele período (contando vezes).
- **Demais tipos:** compara o progresso com o tempo passado até o prazo.
  - Na primeira semana da meta: sempre no ritmo.
  - Razão ≥ 1,1: adiantado.
  - Razão ≥ 0,8: no ritmo.
  - Abaixo disso: um pouco atrás.
- **Explicação:** sempre traz uma frase com a conta, como "faltam R$ 1.900,00 em 2 meses = R$ 950,00/mês".

### Registro (`LogSheet`)

O registro se adapta à medida da meta:

- **Frequência:**
  - **Meta de treino:** pede tipo de atividade, duração, distância (caminhada, corrida, bicicleta) e exercícios com séries, repetições e carga (musculação, calistenia). O tipo vem pré-marcado pelo último usado ou pelo nome da meta.
  - **Outras metas de frequência:** só uma observação.
  - **Como saber se é de treino** (`isFitnessGoal`): já tem treino registrado, o nome fala de atividade física, ou a área usa ícone de exercício.
- **Soma:** valor, com atalhos.
- **Valor:** medição com botões de ±0,1.
- **Etapas:** conclui a próxima etapa.
- **Dias ou horas:** atalhos de 15 min a 3 h, ou horas e minutos digitados.

## Tarefas e o dia

- **Limite diário** (`settings.maxTasks`, padrão 5). O que passar dele vai para **Depois** (sem prazo), nunca fica escondido.
- **Situações:**

  | Situação | Quando |
  |---|---|
  | `pending` | ainda não decidida |
  | `done` | feita |
  | `dismissed` | dispensada; não conta como falha |
  | `not_done` | descartada; fica no histórico como "não feita", sem destaque |

- **Abertura do dia:** a pessoa escolhe o que entra hoje. O que ficou de fora vai para Depois. As **sugestões** vêm das metas sem tarefa na agenda (`suggestTasks`).
- **Fechamento do dia:** cada tarefa que sobrou ganha um destino (mover para amanhã, descartar, ignorar), e o dia fecha.
- **Virada do dia:** padrão 04:00. Antes disso, ainda é o dia anterior.
- **Outros dias:**
  - **Passado:** dá para marcar como feita naquele dia.
  - **Futuro:** concluir antes passa a tarefa para hoje e registra hoje.
  - **"Só marcar no dia"** desliga as duas coisas.

## Tarefas que se repetem

Arquivo: [`domain/recurrence.ts`](../src/domain/recurrence.ts). A regra (`RecurringTask`) tem título, meta opcional, a repetição (`Repeat`) e os dias pulados.

- **Repetição:** a cada N dias, semanas (com dias da semana) ou meses (com dia do mês). Termina nunca, numa data ou depois de N vezes.
- **Ocorrências:**
  - **Hoje:** viram tarefa (`ensureOccurrences`, chamado pelo `AppShell`), dentro do limite diário; o excesso vai para Depois.
  - **Dias futuros:** aparecem como planejadas (`plannedOn`), sem virar tarefa.
  - **Pendentes de dias passados:** viram "não feita", sem se acumular.
  - **Tarefa da mesma meta já marcada no dia:** vale como a ocorrência.
- **Pular e parar:**
  - Excluir a tarefa de uma ocorrência **pula só aquele dia**, para ela não voltar sozinha.
  - "Parar de repetir" tira as pendentes de hoje em diante; as feitas ficam.
- **Sugestão ao criar meta** (`suggestRepeat`):
  - 3x por semana vira seg, qua e sex (`SPREAD`); dias vira seg a sáb; valor vira toda segunda.
  - Soma e etapas não têm tarefa fixa.
  - A repetição termina no prazo da meta; numa meta com marco, não tem fim e para quando o marco acontece.
- **Sem dia arbitrário:** os atalhos do seletor (`RepeatPicker`) não usam o dia de hoje. "Personalizado" começa em segunda-feira.

## Resumos e retrospectiva

Arquivo: [`domain/summaries.ts`](../src/domain/summaries.ts). Quem dispara é o `runSchedule`, ao abrir o app (se o app não abrir no dia, gera na próxima abertura).

- **Mensal:** no dia 1º, sobre o mês anterior, se houver dados. "Gerar agora" fica disponível nos 3 últimos dias do mês.
- **Trimestral:** depois de março, junho, setembro e dezembro.
- **Retrospectiva:** na penúltima quinta de dezembro às 20:00 (24/12 em 2026, 23/12 em 2027), ou na data dos ajustes. Aparece um aviso em Hoje.
- **Com IA ligada:**
  - O resumo nasce com `aiStatus: 'pending'` e um texto provisório só com números.
  - O `useSummaryAI` pede o texto à IA. Se falhar, fica a versão com números, marcada "sem IA".
  - Edição feita pela pessoa nunca é sobrescrita.
- **Sem IA:** o texto é montado só com os números (`mockNarrative`).

## Áreas da vida

Arquivo: [`domain/areas.ts`](../src/domain/areas.ts).

- **Limites:** até 12 áreas ativas, nomes com até 24 caracteres.
- **Cores e ícones:** 10 cores fixas e ícones agrupados.
- **Excluir uma área com metas** exige escolher: mover as metas para outra área ou arquivar a área.

## Módulos

Arquivo: [`domain/modules.ts`](../src/domain/modules.ts).

- **De fábrica:** Fitness e Estudos têm telas próprias. Podem ser renomeados, recoloridos e **escondidos**, guardando ou apagando os registros, e voltam por "Trazer de volta".
- **Criados pela pessoa:**
  - até 8 campos, dos tipos número (com unidade), tempo, nota de 1 a 5, lista de opções, sim/não e texto;
  - um texto no primeiro campo vira o título do registro;
  - podem contar para uma meta, escolhendo qual campo envia o valor.
- **Fitness** ([`domain/fitness.ts`](../src/domain/fitness.ts)): treinos por tipo, peso e progressão de carga (maior carga de cada exercício por dia).
- **Estudos** ([`domain/study.ts`](../src/domain/study.ts)): disciplinas, tempo por semana, acertos e anotações (dificuldade, progresso, insight).

## Conta

Por enquanto, **login local**: o app guarda nome e e-mail para mostrar na tela, e não guarda a senha. "Sair" volta para o login sem apagar os dados.
