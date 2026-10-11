# 18 — Migração das telas

**Depende de:** 17

## Objetivo

Levar todas as telas existentes e novas para os componentes e a moldura da fase 2, removendo o código visual antigo.

## Telas

Login e primeiro acesso · Início por perfil · Alunos · Professores · Funcionários · Usuários · Departamentos · Cursos · Matriz curricular · Disciplinas · Meu curso · Minha matriz · Disciplinas do curso · Meu departamento · Meus dados

## Checklist

- [ ] Login: composição Campus (marca, campo único CPF ou matrícula, fluxo de senha em etapas)
- [ ] Início: saudação, indicadores com `StatTile` coloridos e atalhos por perfil
- [ ] Listagens (Alunos, Professores, Funcionários, Usuários, Departamentos, Cursos, Disciplinas) com `DataTable`, `SegmentedFilter` para situação e `Avatar` nas pessoas
- [ ] Formulários em `Modal` com `Field` (rótulos, ajuda e erros por campo)
- [ ] Matriz curricular redesenhada: semestres como colunas ou blocos, arrastar não é requisito
- [ ] Telas do aluno e do professor (tarefa 16) já nascem no novo padrão
- [ ] Remover `globals.css` legado (`.card`, `.field-input`, `.data-table`, `.modal-*`), componentes antigos e imports mortos
- [ ] Atualizar `docs/design-system.md` com o padrão de cada tela

## Critérios de aceite

- Nenhuma tela usa classes ou componentes legados (`grep` limpo).
- Todos os fluxos que existiam continuam funcionando (a suíte de navegador da tarefa 20 cobre).
- `npm run lint`, `typecheck`, `build` e `test` passam.
