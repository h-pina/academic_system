# 09 — Frontend: alunos e professores

**Depende de:** 04, 05, 08

## Objetivo

Criar as telas de listagem, cadastro e edição de alunos e professores.

## Contexto

- Páginas existentes como modelo: `frontend/src/app/app/register-users/` e `frontend/src/components/users/`
- Componentes reutilizáveis: `Button`, `ConfirmModal`, `ContentHeader`, `LoadingSpinner`
- Cliente HTTP e tipos em `frontend/src/lib` e `frontend/src/types`

## Telas

- `/app/students` — tabela com busca (nome/matrícula/CPF), filtro por curso e status, paginação
- `/app/students/new` e `/app/students/[id]` — formulário (CPF, nome, e-mail, curso, ano de ingresso, status)
- `/app/teachers` — tabela com busca, filtro por departamento e status
- `/app/teachers/new` e `/app/teachers/[id]` — formulário (CPF, nome, e-mail, departamento, titulação, status)

## Checklist

- [ ] Tipos TypeScript e funções de API para students/teachers
- [ ] Hook(s) de listagem com paginação e filtros
- [ ] Componentes de tabela e de formulário (compartilhar o que for possível)
- [ ] Máscara e validação de CPF no formulário
- [ ] Selects de curso/departamento carregados da API
- [ ] Confirmação antes de excluir/inativar (`ConfirmModal`)
- [ ] Tratamento de erros da API (409, 403) com mensagens amigáveis
- [ ] Estados de carregamento e lista vazia
- [ ] Layout responsivo

## Critérios de aceite

- Secretaria consegue criar, editar, filtrar e inativar alunos e professores.
- Professor só visualiza; aluno não acessa essas telas.
- Nenhum erro no console durante o fluxo principal.
