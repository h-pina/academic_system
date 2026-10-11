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

- [x] Tipos e funções de API para departments, courses, subjects, curriculum
- [x] Listagens com busca, filtros e paginação
- [x] Formulários com validação
- [x] Visualização da matriz por semestre (colunas ou seções)
- [x] Seletor de pré-requisitos com feedback de erro de ciclo
- [x] Confirmação antes de exclusões
- [x] Mostrar mensagem clara quando a exclusão é bloqueada (409)
- [x] Layout responsivo (filtros em `flex-wrap`, tabelas com rolagem horizontal; verificação visual em navegador não executada)

## Critérios de aceite

- Secretaria monta a matriz de um curso do zero pela interface.
- Erros de regra (duplicidade, ciclo, semestre inválido) aparecem de forma compreensível.
- Aluno e professor visualizam cursos, disciplinas e matriz em modo somente leitura.

## Decisões tomadas na implementação

- Departamentos, cursos e disciplinas usam **modais** (mesmo padrão da tarefa 09); a matriz curricular é uma página própria, `/app/courses/[courseId]/curriculum`.
- A matriz mostra **todos** os semestres do curso (inclusive os vazios) para permitir adicionar disciplinas em qualquer um; mover de semestre é um `select` na própria linha e obrigatória/optativa é um botão.
- Pré-requisitos são editados no formulário da disciplina (lista com busca). A disciplina é salva primeiro e os pré-requisitos em seguida (`PUT`); se a API recusar (ex.: ciclo), a disciplina fica salva e o usuário é avisado.
- `useAllItems` percorre todas as páginas da API (limite de 100 por página) para pickers e selects, evitando listas truncadas.
- Alunos e professores veem cursos, disciplinas, departamentos e matriz em modo somente leitura; criar/editar aparece para `admin` e `secretary`, excluir só para `admin`.
- Mensagens de erro vindas da API continuam em inglês (tarefa 13).
