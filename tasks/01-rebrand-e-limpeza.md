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
- [ ] Remover módulo `requisitions` da API e do `app.module.ts`
- [ ] Remover tabelas/entidades de requisições do `schema.sql` e do seed
- [ ] Remover páginas e componentes de requisições no frontend
- [ ] Remover o módulo `positions` da API (`api/src/features/positions/`) e do `app.module.ts`
- [ ] Remover a tabela `positions` do `schema.sql` e dos dados do seed
- [ ] Remover `frontend/src/app/app/register-positions/`, `frontend/src/components/positions/` e o item do menu em `Sidebar.tsx`
- [ ] Remover qualquer campo/relacionamento com cargo em `users` (entidade, DTOs, formulários e tipos do frontend)
- [ ] Renomear pacotes (`products-registry-api` etc.) para nomes acadêmicos (ex.: `academic-system-api`)
- [ ] Atualizar título, textos do Header/Footer e metadados do Next.js
- [ ] Atualizar `README.md` (nome, descrição, tabela de workspaces)
- [ ] Limpar rotas do Postman que não existem mais
- [ ] Recriar o banco local (`api/data/app.sqlite`) e confirmar que a API sobe

## Critérios de aceite

- `npm run dev` sobe API e frontend sem erros.
- Login e cadastro de usuários continuam funcionando.
- Nenhuma referência a "requisição", "material", "produto", "position" ou "cargo" resta no código ou na UI (`grep -ri` limpo).
- `npm run typecheck` e `npm run build` passam.
