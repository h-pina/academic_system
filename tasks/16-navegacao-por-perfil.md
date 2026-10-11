# 16 — Navegação e módulos por perfil

**Depende de:** 13

## Objetivo

Redesenhar o que cada perfil encontra no menu. Hoje o menu é o mesmo catálogo filtrado por permissão; passa a ser pensado para a necessidade de cada pessoa.

## Mapa de navegação

| Perfil | Grupo | Módulos |
|---|---|---|
| **Aluno** | (sem grupo) | **Meu curso** · **Minha matriz** · **Disciplinas do curso** · **Meus dados** |
| **Professor** | (sem grupo) | **Meu departamento** · **Alunos** · **Cursos e matrizes** · **Disciplinas** · **Meus dados** |
| **Secretaria** | Pessoas | Alunos · Professores |
| | Estrutura acadêmica | Departamentos · Cursos e matrizes · Disciplinas |
| | Conta | Meus dados |
| **Administrador** | Pessoas, Estrutura acadêmica, Conta | os mesmos da secretaria |
| | Administração | Funcionários · Usuários |
| **Quem acumula perfis** | "Como aluno", "Como professor" | seções separadas, cada uma com os módulos do perfil; módulos repetidos aparecem uma vez |

## Telas novas

- **Meu curso** (`/app/my-course`): curso, departamento, situação, matrícula, ano de ingresso, semestres, carga horária da matriz.
- **Minha matriz** (`/app/my-curriculum`): a matriz do curso do aluno por semestre, com pré-requisitos; somente leitura.
- **Disciplinas do curso** (`/app/my-subjects`): catálogo restrito às disciplinas da matriz do curso do aluno.
- **Meu departamento** (`/app/my-department`): números, cursos e colegas do departamento do professor.
- **Meus dados** (`/app/profile`): nome, e-mail, matrícula, perfis e troca de senha (hoje é um modal no avatar; o atalho do avatar continua).

## Checklist

- [ ] Substituir `features.json` por uma configuração de navegação com grupos, rótulo, ícone, rota e perfis
- [ ] Função que monta o menu de um usuário: filtra por perfil, agrupa, deduplica e separa "Como aluno" / "Como professor" quando há mais de um perfil
- [ ] Criar as telas novas a partir de endpoints e componentes existentes (`/dashboard`, `/courses/:id/curriculum`, `/subjects?courseId=`, `/teachers?departmentId=`)
- [ ] Remover do aluno o acesso de interface a Alunos, Professores, Departamentos e Cursos gerais (rotas redirecionam)
- [ ] Proteção de rotas por configuração (já existe `canAccessRoute`; estender a grupos e rotas novas)
- [ ] Home por perfil reorganizada para apontar para esses módulos
- [ ] Testes: matriz de menu por perfil (incluindo acúmulo), deduplicação, rotas bloqueadas

## Critérios de aceite

- O aluno só vê módulos sobre o próprio percurso e nenhuma lista de outras pessoas.
- O professor vê o seu departamento e continua consultando todos os alunos (decisão abaixo).
- Quem acumula perfis vê seções distintas e nomeadas.
- Nenhuma mudança de permissão na API é necessária; toda restrição aqui é de interface.

## Decisões

- O professor continua vendo **todos** os alunos (como hoje), então a API não muda.
- O aluno vê **só as disciplinas do seu curso**; é uma restrição de interface (a API continua permitindo a leitura do catálogo completo a quem tem perfil).
- "Meus dados" é módulo do menu e também atalho no avatar.
- Os módulos são desenhados para receber turmas, notas e histórico quando a fase de funcionalidades chegar.
