# 18 — Migração das telas

**Depende de:** 17

## Objetivo

Levar todas as telas existentes e novas para os componentes e a moldura da fase 2, removendo o código visual antigo.

## Telas

Login e primeiro acesso · Início por perfil · Alunos · Professores · Funcionários · Usuários · Departamentos · Cursos · Matriz curricular · Disciplinas · Meu curso · Minha matriz · Disciplinas do curso · Meu departamento · Meus dados

## Checklist

- [x] Login: composição Campus (marca, campo único CPF ou matrícula, fluxo de senha em etapas)
- [x] Início: saudação, indicadores com `StatTile` coloridos e atalhos por perfil
- [x] Listagens (Alunos, Professores, Funcionários, Usuários, Departamentos, Cursos, Disciplinas) com `DataTable`, `SegmentedFilter` para situação e `Avatar` nas pessoas
- [x] Formulários em `Modal` com `Field` (rótulos, ajuda e erros por campo)
- [x] Matriz curricular redesenhada: um bloco por semestre com ações por disciplina (mover, obrigatória/optativa, remover) e um modal para adicionar
- [x] Telas do aluno e do professor (tarefa 16) já nascem no novo padrão
- [x] Remover `globals.css` legado (`.card`, `.field-input`, `.data-table`, `.modal-*`), componentes antigos e imports mortos
- [x] Atualizar `docs/design-system.md` com o padrão de cada tela

## Critérios de aceite

- Nenhuma tela usa classes ou componentes legados (`grep` limpo).
- Todos os fluxos que existiam continuam funcionando (a suíte de navegador da tarefa 20 cobre).
- `npm run lint`, `typecheck`, `build` e `test` passam.

## Decisões tomadas na implementação

- Blocos compartilhados criados aqui: `Card`, `FormModal` (diálogo + formulário, com o envio no rodapé), `SearchFilter` e `SelectFilter`. Cada tela ficou com a mesma estrutura: cabeçalho (`PageHeading`), filtros, `DataTable` com paginação, formulário em `FormModal` e `ConfirmDialog`.
- Todas as telas têm um único `h1`, rótulos associados aos campos (`Field`), botões de ícone com nome acessível ("Editar Erin Student") e estados vazios que dizem o que fazer.
- A lista de usuários ganhou busca no cliente (a API devolve todos) e mostra os perfis como badges.
- Foram removidos o CSS legado (`.card`, `.field-*`, `.data-table`, `.modal-*`), o adaptador `Button` e os modais manuais. `globals.css` ficou só com a base (fontes, foco, rolagem).
- Os formulários ainda validam com uma lista de mensagens (aviso único); os erros por campo vindos da API são a tarefa 19.
- Mantido o comportamento do login (incluindo "Esqueceu a senha?"); só a apresentação mudou. A pendência de segurança do `PUT /auth/password/reset` continua registrada.
- Verificado em navegador real (Firefox), com 26 checagens: cada tela com um `h1`, sem marcação legada e sem rolagem horizontal; criar, pesquisar, editar e duplicidade de alunos; departamento (bloqueio e exclusão); ciclo de pré-requisitos; matriz (adicionar e remover); usuário sem vínculo, funcionário e professor a partir de uma pessoa existente; tema escuro; aluno barrado das telas de gestão.
- A suíte de navegador permanente é a tarefa 20; estas checagens são de um script avulso.
