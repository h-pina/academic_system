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

- [ ] Criar módulo `subjects` (entity, DTOs, repository, service, controller)
- [ ] Implementar a matriz curricular (pode ficar em `courses` ou módulo `curriculum`)
- [ ] Validar semestre dentro de `totalSemesters` do curso
- [ ] Impedir disciplina duplicada na mesma matriz (409)
- [ ] Pré-requisitos: bloquear auto-referência e ciclos (detecção por busca em grafo)
- [ ] Bloquear exclusão de disciplina presente em alguma matriz
- [ ] Aplicar `@Roles`
- [ ] Adicionar rotas ao Postman

## Critérios de aceite

- Tentar criar ciclo de pré-requisitos retorna 400 com mensagem clara.
- A matriz é retornada agrupada/ordenada por semestre.
- Testes cobrindo duplicidade, semestre inválido e ciclo de pré-requisitos.
