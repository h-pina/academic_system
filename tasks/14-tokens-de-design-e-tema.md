# 14 — Tokens de design e tema (direção Campus)

**Depende de:** 13

## Objetivo

Estabelecer a base visual da fase 2: a identidade "Campus" (azul-ultramar com coral, sol e menta; cantos bem arredondados) expressa como tokens, com tema claro e escuro.

## Contexto

- Referência visual aprovada: protótipo "Campus" da página de direções visuais (opção C)
- Estilos atuais: `frontend/tailwind.config.ts`, `frontend/src/app/globals.css`, classes utilitárias `.card`, `.field-input`, `.data-table`, `.modal-*`
- Fontes: Bricolage Grotesque (títulos) e DM Sans (texto), via `next/font`

## Checklist

- [ ] Definir tokens como variáveis CSS (cores de marca, superfícies, texto, linhas, estados ok/aviso/erro, raios, sombras, espaçamentos) com valores claro e escuro
- [ ] Mapear os tokens no `tailwind.config.ts` (cores, `borderRadius`, `boxShadow`, `fontFamily`) para que as classes Tailwind usem as variáveis
- [ ] Carregar Bricolage Grotesque e DM Sans com `next/font` (sem requisição bloqueante) e definir a escala tipográfica
- [ ] Tema claro/escuro: respeitar `prefers-color-scheme`, permitir escolha manual e lembrar a escolha, **sem flash** de tema errado no carregamento
- [ ] Alternador de tema (componente) disponível no cabeçalho
- [ ] Marca: símbolo do produto (substituir o ícone genérico) e nome "Sistema Acadêmico"
- [ ] Revisar contraste (WCAG AA) de texto, bordas e estados nos dois temas
- [ ] Documentar os tokens em `docs/design-system.md`

## Critérios de aceite

- Trocar um token muda a aplicação inteira de forma consistente, nos dois temas.
- Nenhuma cor fixa (hex) fora do arquivo de tokens nos componentes novos.
- Escolha de tema persiste ao recarregar e não pisca.
- Testes unitários da lógica de tema (resolução do tema inicial e persistência).

## Decisões

- A base continua sendo Tailwind; os tokens vivem em CSS e o Tailwind apenas os referencia.
