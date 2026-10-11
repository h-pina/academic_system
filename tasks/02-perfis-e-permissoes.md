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

- [x] Criar enum/constantes de perfis compartilhadas (`api/src/common/domain/roles.ts`) e espelhar no frontend (`RoleName` em `frontend/src/types`)
- [x] Criar `RolesService.resolveRoles(userId)` que monta a lista de perfis a partir de `staff`, `teachers` e `students`. **Decisão:** staff e professor só concedem o perfil com `status = 'active'`; aluno concede `student` exceto com `status = 'dropped'`
- [x] Login aceitar CPF ou matrícula (`POST /auth/login {identifier, password}`; `GET /auth/access/:identifier`; `PUT /auth/password/reset {identifier, newPassword}`)
- [x] `roles` na resposta de `/auth/me` e na listagem de usuários. **Decisão:** o JWT leva só `sub` (= `users.id`); os perfis são recalculados a cada requisição
- [x] Criar decorators `@Auth(...roles)` / `@AuthWithoutProfile()` e `RolesGuard` (passa se o usuário tiver **algum** dos perfis exigidos; `admin` herda `secretary`)
- [x] Liberar rotas a usuário sem perfil (`GET /auth/me`, `PUT /users/me`) com `@AuthWithoutProfile()`
- [x] Aplicar `@Auth` nos controllers existentes (users: `admin`; `exists`: `admin` e `secretary`) e deixar o padrão pronto para os novos
- [x] Perfis recalculados a cada requisição (`JwtStrategy.validate`), então desativar usuário ou perfil tem efeito imediato; usuário com `active = false` recebe 401
- [x] Atualizar o seed: um usuário por perfil e um sem vínculo (o usuário com dois perfis fica para a tarefa 08; o teste e2e cria um na hora). Remover `users.roleId` (entidade, DTOs, seed, repositório)
- [x] No frontend, helpers `hasAnyRole`/`canAccessRoute`/`buildMenu` (aceitam lista de perfis) em `lib/access.ts`, com testes
- [x] Tela "cadastro sem vínculo" (`NoProfileNotice`) para usuário com `roles` vazio; o layout também atualiza os perfis via `/auth/me` a cada carga
- [x] Redirecionar usuário sem permissão ao tentar acessar rota protegida (layout de `/app`)

## Critérios de aceite

- Requisição sem token → 401; com perfil insuficiente → 403.
- Cada perfil do seed acessa (ou não) as rotas conforme a tabela.
- Usuário com dois perfis tem a união das permissões.
- Usuário sem vínculo consegue logar, vê a tela explicativa e recebe 403 nas demais rotas.
- Testes de guard cobrindo os quatro perfis, o acúmulo de perfis e o usuário sem perfil.

## Decisões tomadas na implementação

- `GET /users/:cpf/email` continua público (já era assim e o `ProfileModal` o usa sem token). Exposição de e-mail por CPF é um ponto de atenção para endurecer depois.
- `PUT /auth/password/reset` continua público e sem exigir senha atual (comportamento original do sistema). Qualquer pessoa que conheça um CPF ou matrícula pode redefinir a senha; vale substituir por um fluxo com verificação (e-mail/token) antes de produção.
- `POST /users` agora cria o usuário **sem perfil** (somente `admin`). Os perfis nascem nas APIs de alunos, professores e funcionários (tarefas 04, 04b e 05).
