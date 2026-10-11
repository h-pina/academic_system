# 17 — Estrutura da aplicação (shell)

**Depende de:** 15, 16

## Objetivo

Construir a moldura da aplicação no estilo Campus: barra lateral com rótulos e grupos (recolhível), cabeçalho de página e comportamento responsivo.

## Contexto

- Arquivos atuais: `app/app/layout.tsx`, `Header`, `Sidebar`, `ContentHeader`, `ProfileModal`
- Menu e grupos vêm da configuração da tarefa 16

## Checklist

- [ ] Barra lateral com ícone + rótulo, grupos com título, item ativo destacado; recolhe para trilho de ícones e lembra o estado
- [ ] Em telas pequenas, a navegação vira gaveta aberta por botão de menu (com foco preso e Esc)
- [ ] Cabeçalho: marca, alternador de tema, avatar com menu (Meus dados, Sair) e nome/perfil do usuário
- [ ] Cabeçalho de página padronizado: título, descrição curta, ações principais e trilha de navegação (breadcrumb) onde houver profundidade (ex.: Cursos > Matriz)
- [ ] Área de conteúdo com largura máxima e espaçamentos por token
- [ ] Atalho de teclado para focar a busca e para abrir o menu (documentado)
- [ ] Tela "cadastro sem vínculo" e proteção de rota migradas para a nova moldura
- [ ] Testes: lógica de recolher/lembrar estado e de item ativo por rota

## Critérios de aceite

- A moldura funciona de 360 px a telas largas, sem rolagem horizontal da página.
- Navegação completa por teclado e leitor de tela (landmarks `nav`, `main`, `header`).
- O estado recolhido e o tema persistem entre sessões.
