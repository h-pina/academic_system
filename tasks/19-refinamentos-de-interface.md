# 19 — Refinamentos de interface

**Depende de:** 18

## Objetivo

Polir o comportamento: estados de carregamento, vazios e de erro, validação por campo e filtros que sobrevivem à navegação.

## Checklist

- [ ] Skeletons nas listagens e nos indicadores no lugar do spinner global
- [ ] Estados vazios com orientação ("Nenhum aluno encontrado. Limpe os filtros ou cadastre um aluno")
- [ ] Erros de validação da API (`message: string[]`) exibidos **no campo** correspondente, não só em um aviso
- [ ] Filtros, busca e página refletidos na URL (voltar e compartilhar o link mantêm o estado)
- [ ] Toasts consistentes (sucesso, aviso, erro) com ação de desfazer onde fizer sentido
- [ ] Confirmação destrutiva descreve a consequência ("O vínculo de aluno será removido; a pessoa continua cadastrada")
- [ ] Ordenação por coluna nas listagens principais (nome, matrícula, ingresso), com suporte na API
- [ ] Respeitar `prefers-reduced-motion` e revisar tamanhos mínimos de toque

## Critérios de aceite

- Nenhuma tela fica em branco durante o carregamento nem após um erro.
- Recarregar uma listagem filtrada mantém filtros e página.
- Testes das funções puras (serialização de filtros na URL, mapeamento de erros por campo).

## Decisões

- A ordenação exige parâmetros novos na API (`sort`, `order`) com lista branca de colunas; entra aqui porque só faz sentido junto da interface.
