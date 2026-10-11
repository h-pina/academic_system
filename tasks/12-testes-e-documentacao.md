# 12 — Testes e documentação

**Depende de:** 04, 05, 06, 07, 11

## Objetivo

Garantir qualidade mínima com testes automatizados e deixar o projeto documentado para novos desenvolvedores.

## Contexto

- `api/package.json` ainda não tem script de testes
- `api/postman_collection.json`
- `README.md` na raiz

## Checklist

### Testes (API)
- [ ] Configurar Jest (`@nestjs/testing`) em `api` e adicionar script `test`
- [ ] Testes de service: students, teachers, courses, departments, subjects/curriculum
- [ ] Testes do `RolesGuard` para os quatro perfis
- [ ] Teste do detector de ciclos de pré-requisitos
- [ ] Teste de login por CPF e por matrícula, e colisão de matrícula com CPF
- [ ] Teste de integridade: consulta de usuários órfãos (sem `staff`, `teachers` ou `students`) retorna só os esperados
- [ ] Teste de usuário com dois perfis (união de permissões) e de usuário sem perfil (403 nas rotas protegidas)
- [ ] Teste de transação: falha ao criar `students`/`teachers`/`staff` não deixa `users` criado
- [ ] (Opcional) Testes e2e com `supertest` para o fluxo de login + CRUD principal

### Qualidade
- [ ] `npm run lint`, `typecheck` e `build` passando nos dois workspaces
- [ ] Script de teste na raiz (`npm test`) executando os workspaces

### Documentação
- [ ] Atualizar o `README.md`: visão do sistema, requisitos, como rodar, contas de exemplo, perfis e permissões
- [ ] Incluir diagrama ER (da tarefa 03) e lista de endpoints
- [ ] Atualizar e revisar `postman_collection.json`
- [ ] Documentar variáveis de ambiente em `.env.example` (api e frontend)

## Critérios de aceite

- `npm test` passa em ambiente limpo.
- Um desenvolvedor novo consegue subir o projeto apenas seguindo o README.
- Postman cobre todas as rotas existentes.
