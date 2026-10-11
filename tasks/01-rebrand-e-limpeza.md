# 01 — Rebrand e limpeza

**Depende de:** nenhuma

## Objetivo

Remover o domínio de requisição de materiais e renomear o projeto para o contexto acadêmico, deixando uma base limpa (auth + usuários) para as próximas tarefas.

## Contexto

- `api/src/features/requisitions/` — módulo a remover
- `api/src/features/positions/` — módulo a remover
- `frontend/src/app/app/generate-requisition/` e `frontend/src/components/requisitions/` — remover
- `frontend/src/app/app/register-positions/` e `frontend/src/components/positions/` — remover
- `README.md`, `package.json` (raiz, `api`, `frontend`), títulos na UI (Header, Footer, `layout.tsx`)
- `api/sql/schema.sql`, `api/src/seed/seed-data.ts`, `api/postman_collection.json`

## Checklist

- [x] Decisão tomada: **`positions` será removido** (cargos substituídos por perfis acadêmicos e pela titulação do professor)
- [x] Remover módulo `requisitions` da API e do `app.module.ts`
- [x] Remover tabelas/entidades de requisições do `schema.sql` e do seed
- [x] Remover páginas e componentes de requisições no frontend
- [x] Remover o módulo `positions` da API (`api/src/features/positions/`) e do `app.module.ts`
- [x] Remover a tabela `positions` do `schema.sql` e dos dados do seed
- [x] Remover `frontend/src/app/app/register-positions/`, `frontend/src/components/positions/` e o item do menu em `Sidebar.tsx`
- [x] Remover qualquer campo/relacionamento com cargo em `users` (verificado: `users` não tinha campo de cargo; nada a remover)
- [x] Renomear pacotes (`academic-system`, `academic-system-api`, `academic-system-frontend`)
- [x] Atualizar título, textos do Header/login e metadados do Next.js
- [x] Atualizar `README.md` (nome, descrição, tabela de workspaces)
- [x] Limpar rotas do Postman que não existem mais
- [x] Recriar o banco local (`api/data/app.sqlite`) e confirmar que a API sobe
- [x] Configurar a infraestrutura de testes (Vitest, `@nestjs/testing`, supertest, SQLite em memória) e o script `npm test` na raiz (decisão: fica nesta tarefa, não na 12)
- [x] Testes e2e cobrindo login, usuários e a ausência das rotas/tabelas removidas

## Critérios de aceite

- `npm run dev` sobe API e frontend sem erros.
- Login e cadastro de usuários continuam funcionando.
- Nenhuma referência a "requisição", "material", "produto", "position" ou "cargo" resta no código ou na UI (`grep -ri` limpo).
- `npm run typecheck`, `npm run build` e `npm test` passam.
