# 12 — Testes e documentação

**Depende de:** 04, 05, 06, 07, 11

## Objetivo

Garantir qualidade mínima com testes automatizados e deixar o projeto documentado para novos desenvolvedores.

## Contexto

- A infraestrutura de testes (Vitest + supertest, `npm test`) foi criada na tarefa 01; cada tarefa já entrega os testes das suas funcionalidades
- `api/postman_collection.json`
- `README.md` na raiz

## Checklist

### Testes (API)
- [x] Infraestrutura de testes configurada na tarefa 01 (Vitest, `@nestjs/testing`, supertest, banco SQLite em memória)
- [x] Testes dos casos de uso de students, teachers, courses, departments, subjects/curriculum (via API: `api/test/*.e2e-spec.ts`)
- [x] Testes do `RolesGuard` para os quatro perfis (`api/test/roles.e2e-spec.ts`)
- [x] Teste do detector de ciclos de pré-requisitos (unitário em `prerequisite-graph.spec.ts` e via API)
- [x] Teste de login por CPF e por matrícula, e colisão de matrícula com CPF (`identifier.util.spec.ts`, `app.e2e-spec.ts`, `data-model.e2e-spec.ts`)
- [x] Teste de integridade: consulta de usuários órfãos (sem `staff`, `teachers` ou `students`) retorna só os esperados
- [x] Teste de usuário com dois perfis (união de permissões) e de usuário sem perfil (403 nas rotas protegidas)
- [x] Teste de transação: falha ao criar `students`/`teachers`/`staff` não deixa `users` criado
- [x] Testes e2e com `supertest` para login e CRUD de todas as áreas

### Qualidade
- [x] `npm run lint`, `typecheck` e `build` passando nos dois workspaces (ESLint configurado nesta tarefa: `eslint.config.mjs` em `api` e `frontend`)
- [x] Script de teste na raiz (`npm test`) executando os workspaces (criado na tarefa 01)

### Documentação
- [x] Atualizar o `README.md`: visão do sistema, requisitos, como rodar, contas de exemplo, perfis e permissões
- [x] Incluir diagrama ER (da tarefa 03) e lista de endpoints
- [x] Atualizar e revisar `postman_collection.json`
- [x] Documentar variáveis de ambiente (tabela no `README.md`; os `.env.example` já listavam as variáveis)

## Critérios de aceite

- `npm test` passa em ambiente limpo.
- Um desenvolvedor novo consegue subir o projeto apenas seguindo o README.
- Postman cobre todas as rotas existentes.

## Decisões tomadas na implementação

- Cobertura via API (e2e com `supertest`), porque as regras vivem nos serviços e nas restrições do banco; cada tarefa já entregou os seus testes (regra do projeto), então esta tarefa fechou as lacunas: ESLint, teste do resolvedor de identificador e a documentação.
- ESLint 9 com configuração plana: `typescript-eslint` recomendado na API e `next/core-web-vitals` + `next/typescript` no frontend. O script `lint` da API deixou de usar `--fix` (há `lint:fix`).
- O `README.md` ganhou a referência da API (rotas e perfis), a tabela de variáveis de ambiente e as instruções de qualidade. Todas as rotas existentes estão na coleção do Postman (verificado por script ao comparar os controllers com a coleção).
- Pendências conhecidas, fora do roteiro: migrations (hoje `synchronize`), tradução das mensagens de erro da API e dos textos legados da interface (tarefa 13), endurecer `PUT /auth/password/reset` e `GET /users/:cpf/email`, e testes de interface em navegador.
