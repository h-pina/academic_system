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

- [x] Criar módulo `departments` (entity, DTOs, repository, service, controller)
- [x] Criar módulo `courses` (idem), retornando o departamento no detalhe
- [x] Códigos e nomes únicos (409 em duplicidade)
- [x] Bloquear exclusão de departamento com cursos/professores e de curso com alunos (409 com mensagem clara; sugerir inativar)
- [x] Aplicar `@Roles`
- [x] Adicionar rotas ao Postman

## Critérios de aceite

- Todas as regras de unicidade e de bloqueio de exclusão funcionam.
- Testes de service cobrindo CRUD e regras de exclusão.

## Decisões tomadas na implementação

- `GET /departments` não é paginado (alimenta dropdowns) e traz `courseCount` e `teacherCount`; `GET /courses` é paginado e traz `departmentName` e `studentCount`.
- "Todos autenticados" = qualquer usuário **com perfil** (`@Auth()`); usuário sem vínculo recebe 403, de acordo com a tarefa 02.
- Códigos são normalizados para maiúsculas e a unicidade ignora caixa.
- Reduzir `totalSemesters` abaixo do maior semestre usado na matriz retorna 409.
- Excluir curso apaga também a sua matriz (`CASCADE`), mas só é permitido sem alunos; para encerrar um curso com alunos, usar `status: inactive`.
