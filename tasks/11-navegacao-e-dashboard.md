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

- [ ] Definir a configuração do menu em um único lugar (`frontend/src/config`) com perfis permitidos
- [ ] Renderizar a `Sidebar` a partir dessa configuração
- [ ] Proteger as rotas no frontend (redirecionar sem permissão)
- [ ] Criar endpoint `GET /dashboard` (ou `/stats`) na API com contagens por perfil
- [ ] Criar a página inicial conforme o perfil
- [ ] Destacar item ativo e suportar menu recolhido em telas pequenas

## Critérios de aceite

- Cada perfil enxerga apenas os itens permitidos, e o acesso direto por URL a páginas proibidas é bloqueado.
- Os números do dashboard conferem com os dados do banco.
