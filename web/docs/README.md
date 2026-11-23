# Entrelinhas · front-end

App pessoal de metas anuais, tarefas do dia e diário, com resumos do mês e retrospectiva do ano. Tom calmo, sem pressão: nada de vermelho para o que ficou para depois.

É um protótipo funcional (MVP): roda inteiro no navegador, guarda os dados no próprio aparelho e usa IA só no servidor (rota `/api/ia`). Interface em português do Brasil, pensada para celular (390 px), instalável como app (PWA).

## Começar

```bash
cd web
cp .env.example .env        # preencha pelo menos uma chave de IA, se quiser os resumos com IA
npx pnpm@12.3.4 install
npx pnpm@12.3.4 dev         # http://localhost:3000
```

Use sempre o **pnpm** (versão em `package.json` → `packageManager`). O deploy na Vercel instala com `--frozen-lockfile`: dependência instalada com npm quebra o deploy.

Na primeira abertura: login local (qualquer e-mail e senha de 8+ caracteres), boas-vindas e escolha das áreas da vida. O app já vem com dados de exemplo; dá para limpar em **Ajustes → Limpar todas as metas**.

## Documentos

| Documento | O que tem |
|---|---|
| [Arquitetura](./arquitetura.md) | Stack, pastas, como as camadas conversam, PWA |
| [Telas](./telas.md) | Cada rota: o que mostra, de onde vêm os dados, parâmetros de URL |
| [Dados e estado](./dados-e-estado.md) | Modelo de dados, store, persistência, backup, dados de exemplo, banco |
| [Regras do produto](./regras-do-produto.md) | Metas, ritmo, tarefas, repetição, dias, resumos, módulos |
| [Design system](./design-system.md) | Cores, tipografia, componentes, ilustrações, animação, texto, acessibilidade |
| [IA e Esther](./ia-e-esther.md) | Rota `/api/ia`, prompts, provedores, chat da Esther |
| [Desenvolvimento](./desenvolvimento.md) | Scripts, lint e formatação, convenções, deploy, como adicionar coisas |

## Em uma frase por camada

- **`src/app`**: telas (App Router do Next.js) e a rota de servidor `/api/ia`.
- **`src/components`**: casca do app, componentes de tela, UI base e ilustrações.
- **`src/domain`**: regras do negócio em funções puras (metas, ritmo, repetição, resumos, módulos, backup).
- **`src/shared`**: store (Zustand), relógio do app, formatação e utilitários.
- **`src/apis/ai`**: chamada às IAs (OpenAI, Anthropic, Gemini) e montagem dos dados enviados.
- **`src/utils/prompts`**: o texto de cada prompt, um arquivo por situação.
