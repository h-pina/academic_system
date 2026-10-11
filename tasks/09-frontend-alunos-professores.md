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

- [x] Tipos TypeScript e funções de API para students/teachers
- [x] Hook(s) de listagem com paginação e filtros
- [x] Componentes de tabela e de formulário (compartilhar o que for possível)
- [x] Máscara e validação de CPF no formulário
- [x] Selects de curso/departamento carregados da API
- [x] Confirmação antes de excluir/inativar (`ConfirmModal`)
- [x] Tratamento de erros da API (409, 403) com mensagens amigáveis
- [x] Estados de carregamento e lista vazia
- [x] Layout responsivo (filtros em `flex-wrap`, tabelas com rolagem horizontal; verificação visual em navegador não executada)

## Critérios de aceite

- Secretaria consegue criar, editar, filtrar e inativar alunos e professores.
- Professor só visualiza; aluno não acessa essas telas.
- Nenhum erro no console durante o fluxo principal.

## Decisões tomadas na implementação

- Formulários em **modal** (padrão já usado em `register-users`) em vez das rotas `/new` e `/[id]`; evita telas extras e mantém filtros e página ao salvar.
- Infraestrutura reutilizável criada aqui e usada também na tarefa 10: `usePagedList`, `useDebouncedValue`, `usePermissions`, `Pagination`, `StatusBadge`, `lib/labels`, `lib/query`, `lib/validation`, `lib/pagination` (com testes unitários).
- Ao digitar um CPF já cadastrado (consulta `GET /users/:cpf/exists`), o formulário avisa que nome e e-mail serão mantidos e os desabilita, espelhando a regra da API.
- Botões de criar/editar aparecem para `admin` e `secretary`; remover o vínculo, só para `admin`. Professor apenas consulta.
- A API devolve mensagens de erro em inglês (409, 403 etc.); o `useApi` as exibe como estão. A tradução das mensagens do servidor fica para a tarefa 13.
- Sem testes de componente (não há ambiente DOM configurado): a lógica de regras ficou em funções puras testadas; o fluxo de tela foi coberto por typecheck e build.
