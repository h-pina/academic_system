# 14 — Tokens de design e tema (direção Campus)

**Depende de:** 13

## Objetivo

Estabelecer a base visual da fase 2: a identidade "Campus" (azul-ultramar com coral, sol e menta; cantos bem arredondados) expressa como tokens, com tema claro e escuro.

## Contexto

- Referência visual aprovada: protótipo "Campus" da página de direções visuais (opção C)
- Estilos atuais: `frontend/tailwind.config.ts`, `frontend/src/app/globals.css`, classes utilitárias `.card`, `.field-input`, `.data-table`, `.modal-*`
- Fontes: Bricolage Grotesque (títulos) e DM Sans (texto), via `next/font`

## Checklist

- [x] Definir tokens como variáveis CSS (cores de marca, superfícies, texto, linhas, estados ok/aviso/erro, raios, sombras, espaçamentos) com valores claro e escuro
- [x] Mapear os tokens no `tailwind.config.ts` (cores, `borderRadius`, `boxShadow`, `fontFamily`) para que as classes Tailwind usem as variáveis
- [x] Carregar Bricolage Grotesque e DM Sans com `next/font` (sem requisição bloqueante) e definir a escala tipográfica
- [x] Tema claro/escuro: respeitar `prefers-color-scheme`, permitir escolha manual e lembrar a escolha, **sem flash** de tema errado no carregamento
- [x] Alternador de tema (componente) disponível no cabeçalho
- [x] Marca: símbolo do produto (substituir o ícone genérico) e nome "Sistema Acadêmico"
- [x] Revisar contraste (WCAG AA) de texto, links, botões sólidos e estados nos dois temas (verificado por teste automatizado, `tokens.test.ts`)
- [x] Documentar os tokens em `docs/design-system.md`

## Critérios de aceite

- Trocar um token muda a aplicação inteira de forma consistente, nos dois temas.
- Nenhuma cor fixa (hex) fora do arquivo de tokens nos componentes novos.
- Escolha de tema persiste ao recarregar e não pisca.
- Testes unitários da lógica de tema (resolução do tema inicial e persistência).

## Decisões

- A base continua sendo Tailwind; os tokens vivem em CSS e o Tailwind apenas os referencia.
- As escalas `slate`, `red`, `amber`, `emerald` e `brand` do Tailwind foram **remapeadas para os tokens**: as classes legadas (`text-slate-900`, `bg-red-50`...) passam a obedecer ao tema sem que as telas tenham sido migradas. Foi preciso trocar `bg-white` por `bg-surface` e `text-red-700` por `text-red-800` em poucos componentes.
- No tema escuro os passos sólidos (500 a 700) de vermelho, âmbar e esmeralda não são invertidos, para o texto branco em botões sólidos manter contraste.
- Bricolage Grotesque é carregada como fonte variável (informar pesos fixos faz o `next/font` falhar neste ambiente por causa do eixo `font-stretch`).
- Verificado em navegador real (Firefox): tema inicial claro, escolha salva aplicada antes do `DOMContentLoaded`, ciclo claro > escuro > sistema persistido, fontes e marca carregadas, telas legadas escuras pelos tokens (13 checagens).
- A suíte de navegador permanente é a tarefa 20; estas checagens foram feitas com um script avulso.
