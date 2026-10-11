# 17 — Estrutura da aplicação (shell)

**Depende de:** 15, 16

## Objetivo

Construir a moldura da aplicação no estilo Campus: barra lateral com rótulos e grupos (recolhível), cabeçalho de página e comportamento responsivo.

## Contexto

- Arquivos atuais: `app/app/layout.tsx`, `Header`, `Sidebar`, `ContentHeader`, `ProfileModal`
- Menu e grupos vêm da configuração da tarefa 16

## Checklist

- [x] Barra lateral com ícone + rótulo, grupos com título, item ativo destacado; recolhe para trilho de ícones e lembra o estado
- [x] Em telas pequenas, a navegação vira gaveta aberta por botão de menu (com foco preso e Esc)
- [x] Cabeçalho: marca, alternador de tema, avatar com menu (Meus dados, Sair) e nome/perfil do usuário
- [x] Trilha de navegação (breadcrumb) padronizada; o título e as ações de cada tela passam a usar `PageHeading` conforme as telas forem migradas (tarefa 18)
- [x] Área de conteúdo com largura máxima e espaçamentos por token
- [x] Atalho de teclado para focar a busca e para abrir o menu (documentado)
- [x] Tela "cadastro sem vínculo" e proteção de rota migradas para a nova moldura
- [x] Testes: lógica de recolher/lembrar estado e de item ativo por rota

## Critérios de aceite

- A moldura funciona de 360 px a telas largas, sem rolagem horizontal da página.
- Navegação completa por teclado e leitor de tela (landmarks `nav`, `main`, `header`).
- O estado recolhido e o tema persistem entre sessões.

## Decisões tomadas na implementação

- Dependência nova: `@radix-ui/react-dropdown-menu`, só para o menu do usuário (navegação por teclado e foco prontos).
- A barra lateral recolhe a partir de 1024 px e vira gaveta (Radix Dialog) abaixo disso; o botão de menu da barra superior faz uma coisa ou outra conforme a largura, e seu rótulo muda ("Abrir menu", "Recolher menu", "Expandir menu").
- Atalhos: `/` foca a busca da página e `M` abre/recolhe o menu; documentados no próprio menu do usuário ("Atalhos de teclado") e em `docs/design-system.md`.
- Foco vai para o conteúdo após cada navegação, e há um link "Ir para o conteúdo" como primeiro item da tabulação.
- O estado do menu saiu do `UserContext` (que só cuidava de identidade) para o próprio `AppShell`. `Header`, `Sidebar` e `ContentHeader` antigos foram removidos.
- Quem não tem perfil usa a mesma moldura, sem barra lateral nem botão de menu.
- Para os testes de componente foi preciso um `Storage` em memória no setup: o Web Storage experimental do Node 26 sobrepõe o do jsdom e não funciona.
- Verificado em navegador real (Firefox) em 1366 px e 390 px: recolher/expandir e lembrar, `M`, `/`, link de pular, trilha, item ativo em página aninhada, menu do usuário, Sair, gaveta no celular, foco no conteúdo e ausência de rolagem horizontal em 5 telas (20 checagens).
