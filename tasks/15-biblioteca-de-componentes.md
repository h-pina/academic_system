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

- [x] Construir cada componente com variantes e estados (hover, foco visível, desabilitado, carregando, erro)
- [x] `Modal`: foco preso e devolvido, fecha com Esc, `aria-modal`, rolagem interna; usar `@radix-ui/react-dialog` em vez de reimplementar
- [x] `Field`: associar rótulo, descrição e mensagem de erro por `id` e `aria-describedby`
- [x] `DataTable`: colunas declarativas, célula com formatação, linha clicável opcional, navegação por teclado
- [x] Migrar `ConfirmModal` (agora `ConfirmDialog`), `Pagination` e `StatusBadge` para a nova pasta e remover as versões antigas; o `Button` legado virou um adaptador sobre a biblioteca e o `Footer` usa o `Toast`
- [x] Página de catálogo interna (`/app/design`, só em desenvolvimento; rota oculta do menu) listando todos os componentes e estados
- [x] Testes de comportamento dos componentes com lógica (Modal, Field, DataTable, SegmentedFilter) usando `@testing-library/react` e `jsdom`

## Critérios de aceite

- Nenhum módulo precisa mais de CSS próprio para botões, campos, tabelas ou modais.
- Modais e campos passam em verificação de teclado e leitor de tela (rótulos e erros anunciados).
- Testes dos componentes passam em `npm test`.

## Decisões

- Dependência nova: `@radix-ui/react-dialog` (apenas para o modal). Selects continuam nativos, por simplicidade e acessibilidade.
- Introduz ambiente DOM para testes (`jsdom`), o que não existia na fase 1.
- Os formulários das telas continuam nos modais antigos (`.modal-backdrop`); a troca para `Modal` + `Field` é feita junto da migração das telas (tarefa 18). Só as confirmações usam o `Modal` da biblioteca por enquanto.
- O `Modal` guarda o elemento que o abriu e devolve o foco a ele ao fechar: modais controlados por estado (sem `Dialog.Trigger`) não recebiam esse comportamento do Radix. O teste de foco descobriu o problema.
- Corrigido: os indicadores não tinham fundo porque a cor estava registrada como `tileBlue` e a classe é `bg-tile-blue`; as cores agora têm chave em kebab-case, coberta por teste.
- `/app/design` fica fora do menu (`hidden` na configuração) e responde 404 em produção.
- Verificado em navegador real: diálogo nomeado com foco dentro, Tab preso, Esc fecha, foco volta ao botão de origem, catálogo nos dois temas.
- Testes de componente (jsdom + Testing Library): 25 testes de comportamento. Total do frontend: 141.
