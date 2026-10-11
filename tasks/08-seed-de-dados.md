# 08 — Seed de dados

**Depende de:** 04, 05, 06, 07

## Objetivo

Popular o banco vazio com dados acadêmicos de exemplo, para desenvolvimento e demonstração.

## Contexto

- `api/src/seed/seed-data.ts`, `api/src/seed.ts`
- Scripts `npm run seed` e `npm run seed:force` em `api/package.json`
- Tabela de contas no `README.md`

## Dados sugeridos

- 4 usuários base, um por perfil (`admin`, `secretary` em `staff`; `teacher` em `teachers`; `student` em `students`), com senha `password123`
- 1 usuário com **dois perfis** (professor e aluno) para testar a união de permissões
- 1 usuário **sem vínculo** (sem linha em `staff`, `teachers` nem `students`), com senha, para testar a tela "cadastro sem vínculo"
- 1 usuário sem senha para testar o fluxo de primeiro acesso
- Matrícula (`registrationNumber`) preenchida nos alunos, para testar login por CPF e por matrícula
- 2 departamentos (ex.: Computação, Matemática)
- 2 cursos (ex.: Ciência da Computação — 8 semestres; Matemática — 8 semestres)
- ~12 disciplinas, com matriz distribuída por semestre e alguns pré-requisitos
- 3 professores e ~6 alunos (CPFs com dígito verificador válido, fictícios)

## Checklist

- [ ] Reescrever `seed-data.ts` com os dados acima, respeitando a ordem de FKs
- [ ] Manter o seed idempotente (só popula banco vazio; `--force` recria)
- [ ] Atualizar a tabela de contas no `README.md`
- [ ] Conferir login de cada perfil na interface

## Critérios de aceite

- Banco novo + `npm run dev` resulta em dados navegáveis em todas as telas.
- `npm run seed:force` recria tudo sem erro.
- README lista as contas de exemplo corretas.
