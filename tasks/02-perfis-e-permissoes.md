# 02 — Perfis e permissões

**Depende de:** 01, 03

## Objetivo

Substituir os perfis atuais (Administrador, Gerente, Analista) por perfis acadêmicos **derivados das tabelas de extensão** e proteger as rotas por perfil.

## Perfis

| Perfil        | Origem                              | Permissões principais                                        |
|---------------|-------------------------------------|--------------------------------------------------------------|
| `admin`       | `staff.role = 'admin'`              | Tudo, incluindo gestão de usuários e funcionários            |
| `secretary`   | `staff.role = 'secretary'`          | CRUD de alunos, professores, cursos, disciplinas, matriz     |
| `teacher`     | existe linha em `teachers`          | Leitura de cursos/disciplinas/alunos; edita o próprio perfil |
| `student`     | existe linha em `students`          | Leitura do próprio cadastro e da matriz do seu curso         |

- Um usuário pode acumular perfis (ex.: `teacher` + `student`); as permissões são a **união** dos perfis.
- `admin` inclui as permissões de `secretary`.
- Usuário **sem perfil** faz login, mas recebe 403 em tudo, exceto `/auth/me` e troca de senha.

## Contexto

- `api/src/features/auth/jwt-auth.guard.ts`, `jwt-payload.interface.ts`, `jwt.strategy.ts`, `current-user.decorator.ts`
- `api/src/features/auth/auth.service.ts` — login por CPF ou matrícula
- Modelo definido na tarefa 03 (`users`, `staff`, `teachers`, `students`)
- `frontend/src/context/` e `frontend/src/hooks/` — usuário logado
- `api/src/seed/seed-data.ts` — usuários de exemplo

## Checklist

- [ ] Criar enum/constantes de perfis compartilhadas (`api/src/common/`) e espelhar no frontend (`frontend/src/types`)
- [ ] Criar `resolveRoles(userId)` que monta a lista de perfis a partir de `staff`, `teachers` e `students`
- [ ] Login aceitar CPF ou matrícula e retornar token com `roles: string[]`
- [ ] Incluir `roles` no payload do JWT e na resposta de `/auth/me`
- [ ] Criar decorator `@Roles(...)` e `RolesGuard` (passa se o usuário tiver **algum** dos perfis exigidos; `admin` herda `secretary`)
- [ ] Criar decorator/flag para liberar rotas a usuário sem perfil (`/auth/me`, troca de senha)
- [ ] Aplicar `@Roles` nos controllers existentes (users) e deixar o padrão pronto para os novos
- [ ] Decidir a validade do token: recalcular perfis a cada requisição ou aceitar até expirar (documentar a escolha)
- [ ] Atualizar o seed: um usuário por perfil, um com dois perfis e um sem vínculo
- [ ] No frontend, criar helper `hasRole`/`canAccess` (aceita lista) e esconder itens de menu sem permissão (navegação final na tarefa 11)
- [ ] Criar a tela "cadastro sem vínculo" para usuário com `roles` vazio
- [ ] Redirecionar usuário sem permissão ao tentar acessar rota protegida

## Critérios de aceite

- Requisição sem token → 401; com perfil insuficiente → 403.
- Cada perfil do seed acessa (ou não) as rotas conforme a tabela.
- Usuário com dois perfis tem a união das permissões.
- Usuário sem vínculo consegue logar, vê a tela explicativa e recebe 403 nas demais rotas.
- Testes de guard cobrindo os quatro perfis, o acúmulo de perfis e o usuário sem perfil.
