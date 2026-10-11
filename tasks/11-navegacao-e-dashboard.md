# 11 — Navegação e dashboard

**Depende de:** 02, 09, 10

## Objetivo

Reorganizar o menu lateral por perfil e criar a página inicial com um resumo do sistema.

## Contexto

- `frontend/src/components/Sidebar.tsx`, `Header.tsx`, `ContentHeader.tsx`
- `frontend/src/app/app/page.tsx` (home atual)
- Helper de permissões criado na tarefa 02

## Menu por perfil

| Item            | admin | secretary | teacher | student |
|-----------------|:-----:|:----------:|:---------:|:-----:|
| Início          |   ✓   |     ✓      |     ✓     |   ✓   |
| Alunos          |   ✓   |     ✓      |     ✓     |       |
| Professores     |   ✓   |     ✓      |     ✓     |       |
| Departamentos   |   ✓   |     ✓      |     ✓     |   ✓   |
| Cursos          |   ✓   |     ✓      |     ✓     |   ✓   |
| Disciplinas     |   ✓   |     ✓      |     ✓     |   ✓   |
| Funcionários    |   ✓   |            |           |       |
| Usuários        |   ✓   |            |           |       |
| Meu perfil      |   ✓   |     ✓      |     ✓     |   ✓   |

## Dashboard

- Usuário sem perfil: não vê o menu; apenas a tela "cadastro sem vínculo" (tarefa 02)
- Usuário com mais de um perfil: menu e dashboard combinam os perfis (união dos itens)
- admin/secretary: total de alunos ativos, professores, cursos, disciplinas; alunos por curso
- Professor: departamento, cursos do departamento
- Aluno: dados do próprio curso e atalho para a matriz

## Checklist

- [x] Definir a configuração do menu em um único lugar (`frontend/src/config`) com perfis permitidos
- [x] Renderizar a `Sidebar` a partir dessa configuração
- [x] Proteger as rotas no frontend (redirecionar sem permissão)
- [x] Criar endpoint `GET /dashboard` (ou `/stats`) na API com contagens por perfil
- [x] Criar a página inicial conforme o perfil
- [x] Item ativo destacado (já existente) e menu recolhível: a barra lateral fecha ao navegar e é reaberta pelo botão "Menu" do cabeçalho de conteúdo

## Critérios de aceite

- Cada perfil enxerga apenas os itens permitidos, e o acesso direto por URL a páginas proibidas é bloqueado.
- Os números do dashboard conferem com os dados do banco.

## Decisões tomadas na implementação

- `features.json` é a configuração única do menu (rota, rótulo e perfis); `buildMenu`/`canAccessRoute` (testados) alimentam a `Sidebar`, o layout e a proteção de rotas. A matriz da tarefa virou teste: cada perfil e a união de perfis.
- Itens de menu: Cadastro de usuários e Funcionários (só `admin`); Alunos e Professores (`admin`, `secretary`, `teacher`); Departamentos, Cursos e Disciplinas (todos). O aluno só vê Departamentos, Cursos e Disciplinas.
- O `GET /dashboard` devolve só as seções correspondentes aos perfis do usuário (união para quem acumula perfis); os números são contagens diretas no banco e cobertos por teste que os compara com as tabelas.
- "Alunos ativos" conta apenas `status = 'active'` (trancados, formados e desligados ficam de fora), assim como professores e cursos ativos.
- Criada a tela **Funcionários** (`/app/staff`, só `admin`) com listagem, criação, edição de papel/situação e remoção de vínculo; a API protege contra o auto-bloqueio e a remoção do último admin.
- Página inicial: o dashboard por perfil aparece acima dos módulos.
- A verificação visual em navegador (responsividade do menu) não foi executada; foram usados testes unitários, typecheck e build.
