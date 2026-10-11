# 06 — API de cursos e departamentos

**Depende de:** 02, 03

## Objetivo

Implementar o CRUD de departamentos e de cursos.

## Endpoints

### Departamentos
| Método | Rota                | Perfis             |
|--------|---------------------|--------------------|
| GET    | `/departments`      | Todos autenticados |
| GET    | `/departments/:id`  | Todos autenticados |
| POST   | `/departments`      | admin, secretary  |
| PATCH  | `/departments/:id`  | admin, secretary  |
| DELETE | `/departments/:id`  | admin              |

### Cursos
| Método | Rota             | Perfis             |
|--------|------------------|--------------------|
| GET    | `/courses`       | Todos autenticados |
| GET    | `/courses/:id`   | Todos autenticados |
| POST   | `/courses`       | admin, secretary  |
| PATCH  | `/courses/:id`   | admin, secretary  |
| DELETE | `/courses/:id`   | admin              |

Filtros de cursos: `departmentId`, `status`, `q`, `page`, `pageSize`.

## Checklist

- [ ] Criar módulo `departments` (entity, DTOs, repository, service, controller)
- [ ] Criar módulo `courses` (idem), retornando o departamento no detalhe
- [ ] Códigos e nomes únicos (409 em duplicidade)
- [ ] Bloquear exclusão de departamento com cursos/professores e de curso com alunos (409 com mensagem clara; sugerir inativar)
- [ ] Aplicar `@Roles`
- [ ] Adicionar rotas ao Postman

## Critérios de aceite

- Todas as regras de unicidade e de bloqueio de exclusão funcionam.
- Testes de service cobrindo CRUD e regras de exclusão.
