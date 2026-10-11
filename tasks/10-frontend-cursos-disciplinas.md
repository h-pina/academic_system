# 10 — Frontend: cursos, disciplinas e matriz

**Depende de:** 06, 07, 08

## Objetivo

Criar as telas de departamentos, cursos, disciplinas e montagem da matriz curricular.

## Telas

- `/app/departments` — listagem + cadastro/edição (pode ser modal, dado o tamanho do formulário)
- `/app/courses` — listagem com filtro por departamento/status
- `/app/courses/new` e `/app/courses/[id]` — formulário do curso
- `/app/courses/[id]/curriculum` — matriz agrupada por semestre; adicionar, mover de semestre e remover disciplinas
- `/app/subjects` — listagem com busca por código/nome
- `/app/subjects/new` e `/app/subjects/[id]` — formulário (código, nome, carga horária, descrição) e seleção de pré-requisitos

## Checklist

- [ ] Tipos e funções de API para departments, courses, subjects, curriculum
- [ ] Listagens com busca, filtros e paginação
- [ ] Formulários com validação
- [ ] Visualização da matriz por semestre (colunas ou seções)
- [ ] Seletor de pré-requisitos com feedback de erro de ciclo
- [ ] Confirmação antes de exclusões
- [ ] Mostrar mensagem clara quando a exclusão é bloqueada (409)
- [ ] Layout responsivo

## Critérios de aceite

- Secretaria monta a matriz de um curso do zero pela interface.
- Erros de regra (duplicidade, ciclo, semestre inválido) aparecem de forma compreensível.
- Aluno e professor visualizam cursos, disciplinas e matriz em modo somente leitura.
