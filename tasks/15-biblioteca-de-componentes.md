# 15 — Biblioteca de componentes

**Depende de:** 14

## Objetivo

Substituir os componentes feitos à mão por um conjunto coerente, acessível e documentado, construído sobre os tokens da tarefa 14.

## Contexto

- Componentes atuais: `Button`, `ConfirmModal`, `StatusBadge`, `Pagination`, modais de formulário duplicados em cada módulo, tabelas com HTML repetido
- Pasta nova: `frontend/src/components/ui/`

## Componentes

`Button` e `IconButton` · `Field` (rótulo, ajuda, erro) com `Input`, `Select`, `Textarea`, `Checkbox` · `Modal` e `ConfirmDialog` · `DataTable` (cabeçalho fixo, rolagem horizontal, estado vazio e de carregamento) · `Badge` (situações) · `Avatar` (iniciais) · `SegmentedFilter` (as "pílulas" de situação) · `StatTile` (indicador) · `Toast` · `EmptyState` · `Skeleton`

## Checklist

- [ ] Construir cada componente com variantes e estados (hover, foco visível, desabilitado, carregando, erro)
- [ ] `Modal`: foco preso e devolvido, fecha com Esc, `aria-modal`, rolagem interna; usar `@radix-ui/react-dialog` em vez de reimplementar
- [ ] `Field`: associar rótulo, descrição e mensagem de erro por `id` e `aria-describedby`
- [ ] `DataTable`: colunas declarativas, célula com formatação, linha clicável opcional, navegação por teclado
- [ ] Migrar `ConfirmModal`, `Pagination` e `StatusBadge` para a nova pasta e remover as versões antigas
- [ ] Página de catálogo interna (`/app/design`, só em desenvolvimento) listando todos os componentes e estados
- [ ] Testes de comportamento dos componentes com lógica (Modal, Field, DataTable, SegmentedFilter) usando `@testing-library/react` e `jsdom`

## Critérios de aceite

- Nenhum módulo precisa mais de CSS próprio para botões, campos, tabelas ou modais.
- Modais e campos passam em verificação de teclado e leitor de tela (rótulos e erros anunciados).
- Testes dos componentes passam em `npm test`.

## Decisões

- Dependência nova: `@radix-ui/react-dialog` (apenas para o modal). Selects continuam nativos, por simplicidade e acessibilidade.
- Introduz ambiente DOM para testes (`jsdom`), o que não existia na fase 1.
