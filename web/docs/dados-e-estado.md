# Dados e estado

## Onde os dados vivem

Tudo fica no **navegador do aparelho**, em `localStorage`, na chave `entrelinhas-v2` ([`constants.ts`](../src/shared/constants.ts)). Não há servidor de dados ainda. O modelo do banco já existe em [`prisma/schema.prisma`](../prisma/schema.prisma) (PostgreSQL) e espelha os tipos de [`domain/types.ts`](../src/domain/types.ts), mas o app não o usa.

## Store

[`src/shared/store.ts`](../src/shared/store.ts) é um store Zustand com o middleware `persist`:

- **Hidratação manual:** `skipHydration: true`. O `AppShell` reidrata no carregamento, para nenhuma tela renderizar com os dados de exemplo antes dos dados reais.
- **Estado inicial:** são os dados de exemplo (`createSeed(hoje)`).
- **Chaves novas:** quando uma versão do app ganha uma chave nova no estado, quem já tinha dados salvos recebe o valor dos dados de exemplo para essa chave. O merge do `persist` é raso.
- **Leitura:** sempre com seletor, `useStore(state => state.goals)`, para a tela só redesenhar quando aquilo mudar.
- **Escrita:** só pelas ações. Fora do React, use `useStore.getState()` (por exemplo, para montar o backup).

### Formato do estado (`AppData`)

| Chave | Conteúdo |
|---|---|
| `session` | conta logada (`name`, `email`) ou `null` |
| `areas` | áreas da vida (nome, ícone, cor, ordem, arquivada) |
| `goals` | metas (SMART, medida, prazo ou marco, tarefa do dia, lembrete, ícone) |
| `logs` | registros das metas (valor, nota, exercícios, atividade, etapa, tarefa de origem) |
| `tasks` | tarefas do dia (situação, Depois, repetição de origem) |
| `rules` | tarefas que se repetem (regra de repetição, dias pulados) |
| `journal` | entradas do diário (texto, humor, metas ligadas) |
| `summaries` | resumos mensais e trimestrais (texto, título, edição, situação da IA, reflexões) |
| `retros` | retrospectivas por ano (carta, se foi guardada, aviso) |
| `reviews` | textos das revisões por período |
| `workouts`, `weights` | módulo Fitness |
| `subjects`, `studySessions` | módulo Estudos |
| `modules`, `moduleEntries` | módulos (de fábrica e criados) e seus registros |
| `day` | dia aberto e fechado |
| `settings` | ajustes (veja abaixo) |
| `onboarded`, `startedAt` | boas-vindas concluídas; primeiro dia de uso |

### Ações por assunto

| Assunto | Ações |
|---|---|
| Áreas | `saveArea`, `reorderAreas`, `archiveArea`, `restoreArea`, `deleteArea` |
| Metas e registros | `addGoal`, `updateGoal`, `deleteGoal`, `addLog`, `removeLog` |
| Tarefas | `addTask`, `completeTask`, `uncompleteTask`, `moveTask`, `discardTask`, `dismissTask`, `sendToLater`, `bringToToday`, `deleteTask` |
| Repetição | `addRule`, `updateRule`, `removeRule`, `skipOccurrence`, `materializeOccurrence`, `ensureOccurrences` |
| Dia | `openDay`, `closeDay`, `reopenDay` |
| Diário | `saveJournal`, `deleteJournal` |
| Resumos | `runSchedule`, `generateSummary`, `updateSummary`, `ensureRetro`, `updateRetro`, `setReview` |
| Fitness | `addWorkout`, `removeWorkout`, `addWeight`, `removeWeight` |
| Estudos | `saveSubject`, `removeSubject`, `addStudySession`, `removeStudySession` |
| Módulos | `saveModule`, `removeModule`, `restoreModule`, `moveModule`, `addModuleEntry`, `removeModuleEntry` |
| Ajustes e conta | `setSettings`, `finishOnboarding`, `resetAll`, `importData`, `clearGoals`, `signIn`, `signOut` |

### Espelhamento entre metas e módulos

Um registro feito numa meta aparece no módulo certo, e o contrário também. A ligação fica guardada em `logId`, e **excluir de um lado remove do outro**:

- **Treino:** registro de meta de treino (com `activity` ou exercícios) vira treino no Fitness. Treino registrado no Fitness com "Contar para uma meta" cria o registro da meta.
- **Peso:** medição de meta em kg vira peso no Fitness.
- **Estudo:** tempo de uma meta ligada a uma disciplina vira sessão de estudo. Sessão de estudo de disciplina ligada a meta cria o registro.
- **Módulos criados:** registro de módulo ligado a meta cria o registro, com o valor do campo escolhido.

## Ajustes (`settings`)

Os valores padrão estão em [`seed.ts`](../src/domain/seed.ts), em `DEFAULT_SETTINGS`:

| Ajuste | Padrão | Efeito |
|---|---|---|
| `maxTasks` | 5 | limite de tarefas por dia; o que passar vai para Depois |
| `limitTasks` | `true` | liga o limite diário; desligado, cabem quantas tarefas a pessoa quiser (`dailyLimit` devolve `Infinity`) |
| `onlyOnDay` | `false` | tarefas de outros dias só para ver |
| `hideStreaks`, `hidePercent` | `false` | esconde sequências e porcentagens |
| `quietFrom` / `quietTo` | 22:00 / 07:00 | horário sem lembretes |
| `rollover` | 04:00 | virada do dia |
| `monthlyAuto`, `quarterlyAuto`, `retroEnabled` | `true` | resumos e retrospectiva automáticos |
| `retroDate` / `retroTime` | `null` / 20:00 | data da retrospectiva (`null` = penúltima quinta de dezembro) |
| `useAI` | `true` | resumos com IA |
| `theme` | `system` | claro, escuro ou do sistema |
| `illustrations` | `many` | densidade das ilustrações |
| `demoDate` | `null` | data simulada (protótipo) |

## Backup

[`src/domain/backup.ts`](../src/domain/backup.ts), em *Ajustes → Backup e sincronização*:

- **Exportar:** `buildBackup()` gera `{ app: 'entrelinhas', version: 2, exportedAt, data }` com todos os dados, **menos a conta**.
- **Importar:**
  - `parseBackup()` confere o arquivo: JSON válido, do app certo, versão suportada, listas com `id`. Aceita também o formato antigo, com as listas soltas na raiz.
  - A tela mostra um resumo do conteúdo e pede confirmação.
  - `importData()` troca o que veio no arquivo e mantém o resto, a conta e os ajustes que o arquivo não conhece.

Ao mudar o formato do estado, suba `VERSION` em `backup.ts` e mantenha a leitura das versões antigas.

## Dados de exemplo

[`src/domain/seed.ts`](../src/domain/seed.ts) monta um ano de uso fictício, fixo em 2026:

- **5 metas:**
  - academia, 3 a 4 vezes por semana;
  - peso, de 85 para 78 kg;
  - reserva, R$ 5.000,00;
  - Raciocínio Lógico, 60 dias;
  - projeto X, 5 etapas.
- **Histórico:** registros, tarefas, 16 entradas do diário, 2 resumos e a retrospectiva.
- **Módulos:** treinos, pesos e estudos, e o módulo Leitura com registros.
- **Repetições:** academia seg/qua/sex, estudo seg a sáb, peso às segundas, conta de luz todo dia 10.

As tarefas de "hoje" acompanham a data real. "Restaurar dados de exemplo" volta a esse estado.

## Limpar dados

`clearGoals` (em Metas e em Ajustes):

- **`'all'`:** começa do zero. Mantém só áreas, módulos (sem registros), ajustes e conta.
- **`'goals'`:** tira só as metas, os registros e as repetições das metas. Tarefas avulsas, diário e módulos ficam, sem o vínculo.

## Banco de dados (próximo passo)

O esquema Prisma cobre todas as entidades acima, mais `User` (com hash de senha) e `AuthSession`.

- **Configuração:** a conexão vem de `DATABASE_URL`, lida em [`prisma.config.ts`](../prisma.config.ts).
- **Ligar o banco:** criar rotas de servidor para ler e gravar e trocar as ações do store por chamadas a elas, mantendo o `localStorage` como cache para o modo offline.
- **Login de verdade:** precisa do mesmo caminho, e a rota `/api/ia` passa a conferir a sessão.
