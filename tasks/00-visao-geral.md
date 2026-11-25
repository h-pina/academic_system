# 00 — Visão geral

## Objetivo

Transformar o monorepo atual (Sistema de Requisição de Materiais) em um **Sistema Administrativo Acadêmico** para uma instituição de ensino superior.

## Escopo da versão 1

- Cadastro de **funcionários administrativos**, **professores** e **alunos**, todos vinculados a um usuário (`users`) e à autenticação.
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

## Usuários e perfis

- Toda pessoa é uma linha em `users` (identidade e credenciais).
- O perfil é uma **extensão 1:1** de `users`, com `userId` como chave: `staff` (`admin` ou `secretary`), `teachers` e `students`.
- Os perfis são **derivados** de quais tabelas contêm o usuário; nenhum perfil é gravado separadamente.
- Um usuário pode ter **vários perfis** (ex.: professor e aluno) ou **nenhum**. Sem perfil, ele faz login, mas só vê a tela "cadastro sem vínculo".
- Detalhes: tarefas 02 (permissões) e 03 (modelo de dados).

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

## Tarefas

| Tarefa | Arquivo | Tema |
|--------|---------|------|
| 01  | `01-rebrand-e-limpeza.md`            | Remover requisições e `positions`; renomear o projeto |
| 02  | `02-perfis-e-permissoes.md`          | Perfis derivados, JWT e `RolesGuard` |
| 03  | `03-modelo-de-dados.md`              | Entidades, matrícula e usuário sem vínculo |
| 04  | `04-api-alunos.md`                   | CRUD de alunos |
| 04b | `04b-api-funcionarios.md`            | CRUD de funcionários e usuários órfãos |
| 05  | `05-api-professores.md`              | CRUD de professores |
| 06  | `06-api-cursos.md`                   | Departamentos e cursos |
| 07  | `07-api-disciplinas.md`              | Disciplinas, matriz e pré-requisitos |
| 08  | `08-seed-de-dados.md`                | Dados de exemplo |
| 09  | `09-frontend-alunos-professores.md`  | Telas de alunos e professores |
| 10  | `10-frontend-cursos-disciplinas.md`  | Telas de cursos, disciplinas e matriz |
| 11  | `11-navegacao-e-dashboard.md`        | Menu por perfil e dashboard |
| 12  | `12-testes-e-documentacao.md`        | Testes e documentação |
| 13  | `13-interface-em-portugues.md`       | Interface e mensagens de erro em português |

## Ordem de execução

`01 → 03 → 02 → (04, 04b, 05, 06, 07) → 08 → (09, 10) → 11 → 12 → 13`

> A tarefa 02 depende da 03, pois os perfis são derivados do modelo de dados (`staff`, `teachers`, `students`).

## Critério de conclusão

Um administrador consegue entrar, cadastrar departamento, curso, disciplinas, montar a matriz, cadastrar funcionários, professores e alunos, tudo pela interface web, e cada perfil enxerga apenas o que lhe cabe.

## Fase 2: redesenho visual

Fase focada em identidade visual, navegação e experiência de uso, sem novas regras de negócio. Direção escolhida: **Campus** (azul-ultramar, cantos arredondados, tema claro e escuro) com **navegação pensada por perfil**.

| Tarefa | Arquivo | Tema |
|--------|---------|------|
| 14 | `14-tokens-de-design-e-tema.md`        | Tokens, tipografia, tema claro/escuro e marca |
| 15 | `15-biblioteca-de-componentes.md`      | Conjunto de componentes acessíveis |
| 16 | `16-navegacao-por-perfil.md`           | Módulos e menu específicos para cada perfil |
| 17 | `17-estrutura-da-aplicacao.md`         | Moldura: barra lateral, cabeçalho, responsivo |
| 18 | `18-migracao-das-telas.md`             | Todas as telas no novo padrão |
| 19 | `19-refinamentos-de-interface.md`      | Estados, validação por campo, filtros na URL |
| 20 | `20-verificacao-visual-e-e2e.md`       | Testes de navegador e regressão visual |

Ordem: `14 → 15 → 16 → 17 → 18 → 19 → 20` (a 16 só depende da 13 e pode andar em paralelo com a 14 e a 15).

## Fase 3: conformidade com a especificação (Report.pdf)

Operação do semestre: calendário, turmas, inscrição, notas, frequência, atividades, avisos e painel do aluno.
Todas as tarefas estão em `21-38-conformidade-com-a-especificacao.md`; a análise de lacunas está em
`docs/spec-gap-analysis.md`. Ordem: `21 → 22 → 23 → 24 → 25 → (26, 27, 28, 29) → 30 → (31 a 34) → (35, 36, 37) → 38`.
