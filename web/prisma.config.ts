// Configuração do Prisma (versão 7 ou mais nova): lê DATABASE_URL do .env.
// Requer: npm install -D prisma dotenv
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
})
