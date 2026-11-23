# Telas

Todas as telas são componentes de cliente (`'use client'`) e leem os dados do store. As rotas `[id]` e `[year]` são resolvidas no navegador: se o item não existir, mostram o componente `Missing`, com um link de volta.

## Antes do app

| Componente | Quando aparece | O que faz |
|---|---|---|
| [`Login`](../src/components/login.tsx) | sem `session` no store | Entrar ou criar conta. **Login local**: qualquer e-mail válido e senha de 8+ caracteres; a senha não é guardada. Prepara o lugar do login real. |
| [`Onboarding`](../src/components/onboarding.tsx) | `onboarded === false` | 3 telas de boas-vindas e a escolha das áreas da vida (dá para editar e criar áreas). Áreas desmarcadas que já têm metas de exemplo ficam arquivadas, sem perder nada. |

## Abas

### Hoje: `/`

Arquivo: [`src/app/page.tsx`](../src/app/page.tsx).

- **Cabeçalho:** saudação conforme a hora e a data em fonte de voz. Tocar na data abre o calendário do aparelho.
- **Faixa da semana:** setas folheiam as semanas **sem trocar o dia escolhido**; só tocar num dia troca. Os dias com tarefas ganham um ponto. Aparece "Voltar para hoje" ou "Esta semana" quando fizer sentido.
- **Aviso da madrugada:** entre a meia-noite e a virada do dia, avisa que ainda conta como o dia anterior.
- **Hoje:**
  - aviso de resumo ou retrospectiva prontos;
  - cartão "Abrir o dia";
  - **tarefas**, com contador do limite diário e menu por tarefa (Depois, mover para outro dia, copiar para outro dia, editar repetição, excluir ou pular só hoje). "Copiar para outro dia" (`CopySheet`, também nas tarefas planejadas de outros dias e em "Tarefas ligadas" da meta) cria uma tarefa avulsa ligada à mesma meta no dia escolhido, respeitando o limite diário;
  - **Depois**, com as tarefas guardadas sem prazo;
  - **diário** do dia, com humor, texto e metas ligadas;
  - "Fechar o dia".
- **Outro dia** (`?dia=aaaa-mm-dd`):
  - **No futuro, "Planejado":** tarefas marcadas e repetições previstas. Dá para concluir antes, pular, mover e adicionar.
  - **No passado, "Como foi":** tarefas com situação (feita, dispensada, não feita) e o diário. Dá para marcar como feita naquele dia.
  - Com *Ajustes → Só marcar no dia* ligado, outros dias ficam só para ver.
- **Ao concluir:** tarefa ligada a meta abre a [`LogSheet`](../src/components/log-sheet.tsx) para registrar; tarefa avulsa conclui direto, com as estrelinhas.

### Metas: `/metas`

- **Topo:** "Criar com a Esther".
- **Módulos:** cartões de cada módulo visível e "Novo módulo" (veja [`/modulos`](#módulos)).
- **Filtro:** chips de área, em fileira com rolagem por arraste, roda do mouse ou setas.
- **Lista:** metas agrupadas por área, cada uma com progresso, ritmo, sequência (metas de dias) e ícone.
- **Rodapé:** "Limpar todas as metas" e o botão flutuante "Criar meta" (passo a passo).

### Meta: `/metas/[id]`

- **Topo:** ícone da meta (tocar troca o ícone), área, ritmo e o botão **Ajustar com a Esther**.
- **Ações no topo:** editar (lápis) e excluir.
- **Progresso e "Registrar":** o registro se adapta à medida da meta.
- **Na agenda:** a repetição da tarefa, as próximas datas e "Editar repetição" ou "Agendar tarefa".
- **Lembrete, ritmo, gráfico, histórico de registros e tarefas ligadas.**

### Nova meta e editar meta: `/metas/nova`

Passo a passo SMART: Específica, Mensurável, Alcançável, Relevante, Prazo e Resumo.

- **Medidas possíveis:** frequência, soma, valor, etapas, dias ou horas (veja [Regras](./regras-do-produto.md#metas)).
- **No último passo:** data de início ("Começa em": hoje por padrão; antes dela a meta não sugere tarefas, e a repetição nunca começa no passado), prazo (**numa data** ou **num marco**: um acontecimento em texto ou outra meta, com data estimada opcional), lembrete e **tarefa na agenda**, com a repetição sugerida pelo tipo de meta.
- **Modos pela URL:**
  - sem parâmetro: meta nova;
  - `?editar=<id>`: edição. Mantém os registros e os ids das etapas, e a repetição fica na página da meta;
  - `?rascunho=1`: abre o rascunho vindo do chat com a Esther (com `editar=`, é um ajuste);
  - `?ano=2027`: metas do ano seguinte, a partir da retrospectiva.

### Conversa com a Esther: `/metas/ia`

Chat que ajuda a formular a meta no método SMART. Sem parâmetro, cria uma meta; com `?editar=<id>`, ajusta uma existente. Detalhes em [IA e Esther](./ia-e-esther.md#chat-da-esther).

### Diário: `/diario`

- **Aba Entradas:** busca no texto, entradas com humor e metas ligadas, escrever ou editar a entrada de um dia.
- **Aba Resumos:** resumos mensais, trimestrais e a retrospectiva, com "Gerar agora" nos 3 últimos dias do mês.
- `?resumos` abre direto na aba Resumos.

### Resumo: `/diario/resumo/[id]`

- **Texto:** a narrativa, com os estados escrevendo, pronto, editado e sem conexão.
- **Ações:** editar o texto, "Gerar de novo" (com IA, se estiver ligada), fixar.
- **Seções:** o que avançou, o que ficou parado, humor, trechos e perguntas para o próximo período.

### Retrospectiva

| Rota | O que é |
|---|---|
| `/retrospectiva/[year]` | História em cartões, tela cheia: números, áreas, metas, evolução, humor, trechos, o que ficou para depois, carta para o próximo ano |
| `/diario/retrospectiva/[year]` | Os mesmos cartões em página de leitura |

Os dois usam [`useRetroCards`](../src/components/retro.tsx).

### Revisão: `/revisao`

Revisão da semana ou do mês (seletor Semana/Mês), calculada com `periodStats`: o que avançou, o que ficou parado, tarefas feitas, dispensadas e não feitas, e um texto livre ("O que funcionou? O que você quer ajustar?") guardado em `reviews`.

### Abertura e fechamento do dia

| Rota | O que faz |
|---|---|
| `/abertura` | Escolher o que entra hoje, até o limite: o que já estava em hoje, pendências de dias anteriores, sugestões das metas sem agenda e Depois. O que não for escolhido vai para Depois. |
| `/fechamento` | Passar pelas tarefas que ficaram e dar um destino a cada uma: **Mover** (vai para amanhã), **Descartar** (sai da lista e fica como "não feita") ou **Ignorar** (dispensada: não conta como falha). Depois, escrever no diário e fechar o dia. |

### Ajustes: `/ajustes`

- **Conta:** dados da conta e "Sair".
- **Modo saudável:** limite de tarefas, só marcar no dia, esconder sequências e porcentagens, horário de silêncio, virada do dia.
- **Áreas da vida:** link para gerenciar.
- **Resumos e IA:** liga e desliga resumos e retrospectiva, data da retrospectiva, uso de IA.
- **Aparência:** tema; densidade das ilustrações (muitas, poucas, nenhuma).
- **Lembretes por meta.**
- **Backup:** exportar e importar dados.
- **Protótipo:** data simulada, limpar metas, restaurar dados de exemplo.

### Áreas: `/ajustes/areas`

Reordenar arrastando (ou pelas setas do teclado), editar (nome, ícone, cor), arquivar, restaurar e excluir, escolhendo para onde vão as metas da área.

## Módulos

| Rota | O que faz |
|---|---|
| `/modulos` | Gerenciar: ordem, editar, remover (Fitness e Estudos só se escondem) e criar a partir de modelos (Leitura, Sono, Meditação, Alimentação, Gastos, Idiomas) ou em branco |
| `/modulos/editor` | Nome, ícone, cor, campos e meta ligada. `?id=<id>` edita; `?modelo=<chave>` parte de um modelo |
| `/modulos/[id]` | Tela de um módulo criado: números da semana, gráfico por campo, opções mais frequentes, sim/não, anotações, histórico e registro |
| `/fitness` | Treinos por tipo (musculação, calistenia, alongamento, caminhada, corrida, bicicleta, dança, outro), peso, progressão de carga, tipos nos últimos 30 dias, histórico |
| `/estudos` | Disciplinas, tempo por semana, acertos por semana, anotações (dificuldades, progressos, insights), sessões |

## Parâmetros de URL

| Rota | Parâmetro | Efeito |
|---|---|---|
| `/` | `dia=aaaa-mm-dd` | abre num dia que não é hoje |
| `/diario` | `resumos` | abre na aba Resumos |
| `/metas/nova` | `editar=<id>`, `rascunho=1`, `ano=<aaaa>` | editar, rascunho da Esther, ano da meta |
| `/metas/ia` | `editar=<id>` | ajustar uma meta com a Esther |
| `/modulos/editor` | `id=<id>`, `modelo=<chave>` | editar módulo, partir de modelo |

## Erros e vazios

- [`not-found.tsx`](../src/app/not-found.tsx) e [`error.tsx`](../src/app/error.tsx) usam o `EmptyState`.
- Toda lista vazia tem um estado vazio com ilustração, uma frase e uma ação.
