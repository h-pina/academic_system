# 04 — API de alunos

**Depende de:** 02, 03

## Objetivo

Implementar o CRUD de alunos na API. O aluno é uma extensão de `users` (`students`, com `userId` como PK/FK) e está vinculado a um curso.

## Endpoints

| Método | Rota             | Perfis                         | Descrição                                   |
|--------|------------------|--------------------------------|---------------------------------------------|
| GET    | `/students`      | admin, secretary, teacher      | Lista com filtros e paginação               |
| GET    | `/students/:id`  | admin, secretary, teacher, student (só o próprio) | Detalhe          |
| POST   | `/students`      | admin, secretary               | Cria `users` (se necessário) + `students`   |
| PATCH  | `/students/:id`  | admin, secretary               | Atualiza dados / status                     |
| DELETE | `/students/:id`  | admin                          | Remove o vínculo (preferir inativar)        |

`:id` é o `userId`. Filtros da listagem: `courseId`, `status`, `q` (nome/matrícula/CPF), `page`, `pageSize`.

## Contexto

- Seguir a estrutura de `api/src/features/users/` (dto, entity, repository, service, controller, module)
- Reaproveitar a validação de CPF existente em users
- Modelo da tarefa 03; perfis e guard da tarefa 02
- Registrar o módulo em `app.module.ts`

## Checklist

- [ ] Criar módulo `students` (entity, DTOs com `class-validator`, repository, service, controller)
- [ ] `POST` em **transação**: reaproveita o `users` se o CPF já existir; senão cria `users` sem senha (definida no primeiro acesso) e depois `students`
- [ ] Rejeitar (409) se o usuário já tem linha em `students`
- [ ] Gerar a matrícula em `users.registrationNumber` no formato `AAAA` + 6 dígitos sequenciais por ano (`AAAA` = `entryYear`), dentro da mesma transação do `POST`; não aceitar valor informado pelo cliente
- [ ] Se o usuário já tiver `registrationNumber` (ex.: já é professor), manter o existente
- [ ] Validar que `courseId` existe e está ativo
- [ ] Aplicar `@Roles` conforme a tabela
- [ ] Aluno só enxerga o próprio registro
- [ ] Encerrar vínculo por `status` (inativar); o `DELETE` só remove a linha de `students`, nunca o `users`
- [ ] Adicionar rotas à coleção do Postman

## Critérios de aceite

- CPF ou matrícula duplicados retornam 409.
- Criar aluno para um CPF que já é professor reaproveita o usuário e não duplica `users`.
- Falha ao criar `students` não deixa `users` órfão (transação revertida).
- Curso inexistente retorna 400/404 com mensagem clara.
- Aluno não acessa dados de outro aluno (403).
- Testes de service cobrindo criação, reaproveitamento de usuário, duplicidade e permissão.
