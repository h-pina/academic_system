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

- [x] Substituir `features.json` por uma configuração de navegação (`config/navigation.ts`) com grupos, rótulo, descrição, ícone, rota e perfis
- [x] Função que monta o menu de um usuário: filtra por perfil, agrupa, deduplica e separa "Como aluno" / "Como professor" quando há mais de um perfil
- [x] Criar as telas novas a partir de endpoints e componentes existentes (`/dashboard`, `/courses/:id/curriculum`, `/subjects?courseId=`, `/teachers?departmentId=`)
- [x] Remover do aluno o acesso de interface a Alunos, Professores, Departamentos e Cursos gerais (rotas redirecionam)
- [x] Proteção de rotas por configuração (já existe `canAccessRoute`; estender a grupos e rotas novas)
- [x] Home por perfil reorganizada para apontar para esses módulos
- [x] Testes: matriz de menu por perfil (incluindo acúmulo), deduplicação, rotas bloqueadas

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

## Decisões tomadas na implementação

- Nenhuma mudança de permissão na API. Única adição: `GET /auth/me` passou a devolver `email`, para a tela "Meus dados" não depender do endpoint público de e-mail por CPF.
- O modal do avatar foi substituído pela página `/app/profile`; o avatar do cabeçalho agora é um link para ela. `GET /users/:cpf/email` ficou sem consumidores e pode ser removido (pendência de segurança já registrada).
- O usuário sem vínculo continua vendo só o aviso "cadastro sem vínculo", mas pode abrir "Meus dados" (a API já permite `PUT /users/me` sem perfil).
- Quem acumula perfis recebe blocos "Como professor" e "Como aluno"; os módulos da equipe administrativa mantêm os próprios grupos e vêm primeiro. Um módulo repetido (ex.: "Meus dados") aparece uma única vez.
- A rota interna `/app/design` fica fora do menu (rotas ocultas) e acessível a quem tem perfil; em produção responde 404.
- A matriz do aluno é só de leitura e usa um componente próprio (`CurriculumReadOnly`); a tela de gestão da matriz continua como estava e será migrada na tarefa 18.
- Verificado em navegador real (Firefox), com um usuário por perfil: menus, conteúdo das telas novas (a lista de disciplinas do aluno de Matemática tem 7 de 12 disciplinas), redirecionamentos de rotas proibidas, blocos de quem acumula perfis, validação por campo em "Meus dados" e acesso do usuário sem vínculo (20 checagens).
- Documentação em `docs/navigation.md`.
