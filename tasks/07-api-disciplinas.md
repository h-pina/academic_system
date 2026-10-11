# 07 — API de disciplinas e matriz curricular

**Depende de:** 02, 03, 06

## Objetivo

Implementar o CRUD de disciplinas, a matriz curricular dos cursos e os pré-requisitos.

## Endpoints

### Disciplinas
| Método | Rota             | Perfis             |
|--------|------------------|--------------------|
| GET    | `/subjects`      | Todos autenticados |
| GET    | `/subjects/:id`  | Todos autenticados |
| POST   | `/subjects`      | admin, secretary  |
| PATCH  | `/subjects/:id`  | admin, secretary  |
| DELETE | `/subjects/:id`  | admin              |

### Matriz curricular
| Método | Rota                                  | Perfis             | Descrição                          |
|--------|---------------------------------------|--------------------|------------------------------------|
| GET    | `/courses/:id/curriculum`             | Todos autenticados | Disciplinas do curso por semestre  |
| POST   | `/courses/:id/curriculum`             | admin, secretary  | Adiciona disciplina à matriz       |
| PATCH  | `/courses/:id/curriculum/:subjectId`  | admin, secretary  | Altera semestre / obrigatoriedade  |
| DELETE | `/courses/:id/curriculum/:subjectId`  | admin, secretary  | Remove da matriz                   |

### Pré-requisitos
| Método | Rota                                   | Perfis            |
|--------|----------------------------------------|-------------------|
| PUT    | `/subjects/:id/prerequisites`          | admin, secretary |

## Checklist

- [x] Criar módulo `subjects` (entity, DTOs, repository, service, controller)
- [x] Implementar a matriz curricular (pode ficar em `courses` ou módulo `curriculum`)
- [x] Validar semestre dentro de `totalSemesters` do curso
- [x] Impedir disciplina duplicada na mesma matriz (409)
- [x] Pré-requisitos: bloquear auto-referência e ciclos (detecção por busca em grafo)
- [x] Bloquear exclusão de disciplina presente em alguma matriz
- [x] Aplicar `@Roles`
- [x] Adicionar rotas ao Postman

## Critérios de aceite

- Tentar criar ciclo de pré-requisitos retorna 400 com mensagem clara.
- A matriz é retornada agrupada/ordenada por semestre.
- Testes cobrindo duplicidade, semestre inválido e ciclo de pré-requisitos.

## Decisões tomadas na implementação

- A matriz curricular fica no módulo `courses` (`CurriculumController`/`CurriculumService`), sob `/courses/:courseId/curriculum`; o `GET` já devolve os semestres agrupados e ordenados, com carga horária por semestre e total.
- Detecção de ciclos em função pura (`subjects/prerequisite-graph.ts`, com testes unitários) e aplicada dentro de uma transação serializada; se a substituição for rejeitada, os pré-requisitos anteriores permanecem.
- `PUT /subjects/:id/prerequisites` **substitui** o conjunto inteiro (idempotente); a lista vazia remove todos.
- Não há validação de que o pré-requisito esteja em semestre anterior na mesma matriz; é uma regra possível para uma versão futura.
- Excluir disciplina é bloqueado (409) se ela estiver em alguma matriz ou for pré-requisito de outra; os vínculos de pré-requisito da própria disciplina são removidos junto com ela.
- A listagem de disciplinas aceita `courseId` para filtrar as disciplinas da matriz de um curso.
