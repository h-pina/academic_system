# 05 — API de professores

**Depende de:** 02, 03

## Objetivo

Implementar o CRUD de professores na API, vinculado ao usuário (CPF) e ao departamento.

## Endpoints

| Método | Rota              | Perfis                       | Descrição                      |
|--------|-------------------|------------------------------|--------------------------------|
| GET    | `/teachers`       | Admin, Secretaria, Professor | Lista com filtros e paginação  |
| GET    | `/teachers/:id`   | Admin, Secretaria, Professor | Detalhe                        |
| POST   | `/teachers`       | Admin, Secretaria            | Cria professor (e usuário)     |
| PATCH  | `/teachers/:id`   | Admin, Secretaria            | Atualiza dados / status        |
| DELETE | `/teachers/:id`   | Admin                        | Remove (ou inativa)            |

Filtros: `departmentId`, `status`, `q` (nome/CPF), `page`, `pageSize`.

## Contexto

- Mesma estrutura de feature de `api/src/features/users/`
- Depende da entidade `Department` (tarefa 06 cria o CRUD; aqui basta a entidade da tarefa 03)

## Checklist

- [ ] Criar módulo `teachers` (entity, DTOs, repository, service, controller, module)
- [ ] `POST` em transação: reaproveita o `users` se o CPF existir; senão cria `users` sem senha e depois `teachers` (o perfil professor é a própria linha em `teachers`, ver tarefas 02 e 03)
- [ ] Validar `departmentId` existente
- [ ] Aplicar `@Roles`
- [ ] Impedir exclusão de professor vinculado a outros registros futuros (preparar para turmas na v2: preferir inativar)
- [ ] Adicionar rotas ao Postman

## Critérios de aceite

- CPF já cadastrado como professor retorna 409.
- Listagem filtra por departamento e status.
- Testes de service cobrindo criação, duplicidade e filtros.
