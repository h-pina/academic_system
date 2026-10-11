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

- [x] Criar módulo `teachers` (entity, DTOs, repository, service, controller, module)
- [x] `POST` em transação: reaproveita o `users` se o CPF existir; senão cria `users` sem senha e depois `teachers` (o perfil professor é a própria linha em `teachers`, ver tarefas 02 e 03)
- [x] Validar `departmentId` existente
- [x] Aplicar `@Roles`
- [x] Impedir exclusão de professor vinculado a outros registros futuros (preparar para turmas na v2: preferir inativar)
- [x] Adicionar rotas ao Postman

## Critérios de aceite

- CPF já cadastrado como professor retorna 409.
- Listagem filtra por departamento e status.
- Testes de service cobrindo criação, duplicidade e filtros.

## Decisões tomadas na implementação

- Professores **não recebem matrícula**: entram pelo CPF. Se a pessoa já tiver matrícula (ex.: também é aluno), ela é mantida.
- A tarefa 06 criará o CRUD de departamentos; aqui o departamento é validado diretamente pela entidade (`400` se não existir).
- Professor inativo (`status = 'inactive'`) não tem o perfil `teacher` (efeito imediato, pois os perfis são calculados a cada requisição).
- `DELETE` remove apenas a linha de `teachers`; a orientação é inativar, para preservar o histórico quando houver turmas (v2).
- A listagem permite acesso a `teacher` além de `admin` e `secretary`; criar, alterar e excluir seguem a tabela de perfis da tarefa.
