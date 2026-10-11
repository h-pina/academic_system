# 00 — Visão geral

## Objetivo

Transformar o monorepo atual (Sistema de Requisição de Materiais) em um **Sistema Administrativo Acadêmico** para uma instituição de ensino superior.

## Escopo da versão 1

- Cadastro de **alunos** e **professores**, vinculados aos usuários/autenticação.
- Cadastro de **departamentos**, **cursos** e **disciplinas**.
- **Matriz curricular**: associação de disciplinas a cursos (semestre, carga horária, pré-requisitos).
- Controle de acesso por perfil (Administrador, Secretaria, Professor, Aluno).
- **Autenticação por CPF ou matrícula**: o usuário informa um único identificador (CPF, só dígitos, ou número de matrícula) e a senha. A API resolve o identificador para o usuário correspondente.

## Fora do escopo (versão 2+)

- Inscrição em turmas / ofertas por semestre (nunca chamada de "matrícula", que é o identificador da pessoa).
- Lançamento de notas e controle de frequência.
- Emissão de histórico e documentos.

## Glossário

| Termo        | Significado                                                              |
|--------------|--------------------------------------------------------------------------|
| Aluno        | Pessoa vinculada a um curso, identificada pela matrícula                 |
| Matrícula    | Identificador único da pessoa na instituição (10 dígitos: ano + sequencial); campo `registrationNumber` |
| Inscrição    | Ato de se inscrever em turmas/disciplinas do semestre (v2)               |
| Professor    | Docente vinculado a um departamento                                      |
| Departamento | Unidade acadêmica que agrupa cursos e professores                        |
| Curso        | Programa de graduação (ex.: Ciência da Computação)                       |
| Disciplina   | Unidade curricular com carga horária (ex.: Cálculo I)                    |
| Matriz       | Conjunto de disciplinas de um curso, organizadas por semestre            |

## Autenticação

- Login aceita **CPF** (11 dígitos) **ou matrícula** (10 dígitos) no mesmo campo.
- Formato da matrícula: `AAAA` (ano de ingresso) + 6 dígitos sequenciais por ano, ex.: `2026000123`. Sem prefixo e sem dígito verificador na v1.
- Regra de login: remover tudo que não é dígito; 11 dígitos → CPF; 10 dígitos → matrícula.
- A matrícula é única, pertence à **pessoa** (`users`), é uma só mesmo para quem acumula perfis, e é opcional (professores e funcionários podem entrar só por CPF).
- "RA" não é usado no sistema: o identificador chama-se sempre "matrícula".
- O fluxo de "definir senha no primeiro acesso" funciona com ambos os identificadores.
- Impacto: tarefas 02 (JWT/guard), 03 (unicidade e formato da matrícula), 04 (geração da matrícula) e o formulário de login no frontend.

## Stack (mantida)

- `api`: NestJS 10 + TypeORM + SQLite
- `frontend`: Next.js (App Router) + Tailwind

## Ordem de execução

`01 → 03 → 02 → (04, 04b, 05, 06, 07) → 08 → (09, 10) → 11 → 12`

> A tarefa 02 depende da 03, pois os perfis são derivados do modelo de dados (`staff`, `teachers`, `students`).

## Critério de conclusão

Um administrador consegue entrar, cadastrar departamento, curso, disciplinas, montar a matriz, cadastrar professores e alunos, tudo pela interface web.
