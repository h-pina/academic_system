# 04b — API de funcionários administrativos

**Depende de:** 02, 03

## Objetivo

Permitir que o administrador cadastre e gerencie os funcionários administrativos (`staff`: `admin` e `secretary`), além de listar usuários sem vínculo.

## Endpoints

### Funcionários

| Método | Rota           | Perfis | Descrição                                         |
|--------|----------------|--------|---------------------------------------------------|
| GET    | `/staff`       | admin  | Lista com filtros (`role`, `status`, `q`) e paginação |
| GET    | `/staff/:id`   | admin  | Detalhe (`:id` é o `userId`)                      |
| POST   | `/staff`       | admin  | Cria `users` (se necessário) + `staff`            |
| PATCH  | `/staff/:id`   | admin  | Altera papel (`admin` ou `secretary`) ou status   |
| DELETE | `/staff/:id`   | admin  | Remove o vínculo (preferir inativar)              |

### Usuários sem vínculo

| Método | Rota                  | Perfis | Descrição                                                        |
|--------|-----------------------|--------|------------------------------------------------------------------|
| GET    | `/users/orphans`      | admin  | Usuários sem linha em `staff`, `teachers` nem `students`         |
| POST   | `/users`              | admin  | (Opcional) cria usuário sem vínculo, para vincular depois        |

## Contexto

- Modelo da tarefa 03; perfis e guard da tarefa 02
- Mesma estrutura de feature de `api/src/features/users/`
- O usuário administrador inicial vem do seed (tarefa 08)

## Checklist

- [ ] Criar módulo `staff` (entity, DTOs, repository, service, controller, module)
- [ ] `POST` em transação: reaproveita o `users` se o CPF existir; senão cria `users` sem senha e depois `staff`
- [ ] Rejeitar (409) se o usuário já tem linha em `staff`
- [ ] **Não permitir** remover, inativar ou rebaixar o último `admin` ativo (409)
- [ ] Impedir que o administrador altere o próprio papel ou o próprio status (evitar auto-bloqueio)
- [ ] Implementar `GET /users/orphans` (consulta com `LEFT JOIN` nas três tabelas de extensão)
- [ ] Decidir se `POST /users` (sem vínculo) existe; se existir, restrito a `admin` e documentado
- [ ] Aplicar `@Roles('admin')` em todas as rotas
- [ ] Adicionar rotas ao Postman

## Critérios de aceite

- Somente `admin` acessa as rotas; `secretary` recebe 403.
- Sempre existe pelo menos um `admin` ativo.
- `GET /users/orphans` lista exatamente os usuários sem nenhum perfil.
- Falha na criação de `staff` não deixa `users` órfão (transação revertida).
- Testes de service cobrindo criação, reaproveitamento de usuário, regra do último admin e duplicidade.
