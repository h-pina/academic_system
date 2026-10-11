# 19 — Refinamentos de interface

**Depende de:** 18

## Objetivo

Polir o comportamento: estados de carregamento, vazios e de erro, validação por campo e filtros que sobrevivem à navegação.

## Checklist

- [x] Skeletons nas listagens e nos indicadores no lugar do spinner global
- [x] Estados vazios com orientação ("Nenhum aluno encontrado. Limpe os filtros ou cadastre um aluno")
- [x] Erros de validação da API (`message: string[]`) exibidos **no campo** correspondente, não só em um aviso
- [x] Filtros, busca e página refletidos na URL (voltar e compartilhar o link mantêm o estado)
- [x] Toasts consistentes (sucesso, aviso, erro; `Toast` da biblioteca, erros anunciados de forma assertiva). Ação de **desfazer** não foi implementada: nenhuma das ações da interface tem como ser revertida com segurança (remover vínculo exigiria recriar com os dados originais)
- [x] Confirmação destrutiva descreve a consequência ("O vínculo de aluno será removido; a pessoa continua cadastrada")
- [x] Ordenação por coluna nas listagens principais (nome, matrícula, ingresso), com suporte na API
- [x] Respeitar `prefers-reduced-motion` e revisar tamanhos mínimos de toque

## Critérios de aceite

- Nenhuma tela fica em branco durante o carregamento nem após um erro.
- Recarregar uma listagem filtrada mantém filtros e página.
- Testes das funções puras (serialização de filtros na URL, mapeamento de erros por campo).

## Decisões

- A ordenação exige parâmetros novos na API (`sort`, `order`) com lista branca de colunas; entra aqui porque só faz sentido junto da interface.

## Decisões tomadas na implementação

- **Erros por campo.** A API passou a devolver, nos 400 de validação, `errors: [{ field, message }]` além da lista `message` (compatível). O `useApi` tem a opção `fieldErrors: true`: erros de validação voltam por campo e não geram toast; os demais continuam em toast. O `FormModal` leva o foco ao primeiro campo inválido e a mensagem some quando a pessoa edita o campo.
- **Validação do cliente por campo.** Cada formulário usa as funções `*FieldErrors` (as listas antigas `validate*Draft` continuam, derivadas delas).
- **Filtros na URL.** `useListState` guarda busca, filtros, página e ordenação na query string (lida na montagem, escrita com `replaceState` para não encher o histórico). Mudar filtro ou ordenação volta à página 1. Aplicado a Alunos, Professores, Funcionários, Cursos e Disciplinas; Usuários e Departamentos não paginam.
- **Ordenação.** `sort` e `order` na API com lista fixa de colunas por endpoint (nunca uma coluna arbitrária) e desempate por nome; cabeçalhos ordenáveis com `aria-sort`, ciclo crescente, decrescente, padrão.
- **Movimento e toque.** `prefers-reduced-motion` zera animações e transições; botões de ícone têm 44 px em telas de toque.
- **Skeletons e estados vazios** vieram junto da migração das telas (tarefa 18); aqui só foram completados (`Home` com skeleton dos indicadores).
- **Testes.** API: 16 novos (ordenação em 5 listagens, erros por campo, `resolveSort`); frontend: validação por campo, `fieldErrors`, `queryState`, `sort`, `useListState`, cabeçalhos ordenáveis e `FormModal`.
- Verificado em navegador real (Firefox), com 13 checagens: ordenação e URL, recarregar mantém, link copiado reproduz a lista, erro da API no campo com foco e sem toast duplicado, mensagem some ao editar, formulário vazio marca todos os campos.
