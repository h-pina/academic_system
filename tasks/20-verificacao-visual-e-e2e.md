# 20 — Verificação visual e testes de navegador

**Depende de:** 18, 19

## Objetivo

Proteger o resultado visual e os fluxos principais com testes executados em navegador real, para que mudanças futuras não quebrem a aparência nem o uso.

## Contexto

- Na fase 1 os fluxos foram verificados por um script avulso (Firefox via Puppeteer, fora do repositório). Esta tarefa o traz para dentro do projeto.
- O navegador baixado pelo Playwright não funcionou neste ambiente; a suíte deve aceitar um executável configurável (`BROWSER_PATH`).

## Checklist

- [x] Suíte `e2e/` na raiz: sobe API (banco temporário com seed) e frontend, executa os fluxos e encerra
- [x] Fluxos: login por CPF e por matrícula, cadastro de aluno, erro de duplicidade, matriz e pré-requisito com ciclo, aluno sem acesso a módulo restrito, usuário sem vínculo, troca de tema
- [x] Capturas de tela das telas principais, nos temas claro e escuro, em larguras de celular e desktop
- [x] Comparação com imagens de referência versionadas (`pixelmatch`) com tolerância configurável e relatório das diferenças
- [x] Script para atualizar as referências de forma explícita (`npm run test:visual -- --update`)
- [x] Documentar como rodar localmente e o que fazer quando o navegador não está disponível (testes são pulados com aviso)
- [x] Script `npm run test:e2e` na raiz

## Critérios de aceite

- A suíte passa em ambiente limpo com o navegador configurado.
- Uma mudança intencional de cor ou espaçamento faz o teste visual falhar e mostra a diferença.
- Documentação em `README.md` e `CLAUDE.md`.

## Decisões

- Dependências de desenvolvimento novas: `puppeteer-core`, `pixelmatch`, `pngjs`.
- A comparação visual usa o mesmo navegador e a mesma fonte para evitar diferenças falsas entre máquinas; as referências ficam em `e2e/__screenshots__/`.

## Decisões tomadas na implementação

- A suíte é um workspace (`e2e/`) com um executor próprio (`run.mjs`), sem framework de testes: duas suítes (`visual`, depois `flows`), cada uma com uma pilha nova (API com SQLite temporário e semeado + frontend já compilado), então os dados são sempre o seed.
- O navegador é detectado por `BROWSER_PATH` ou pelo `PATH`; Firefox usa WebDriver BiDi e Chrome o protocolo DevTools. Sem navegador a execução é **pulada com aviso** (exit 0); `E2E_REQUIRE_BROWSER=1` a transforma em erro.
- Os 7 fluxos cobrem os itens da tarefa e mais: erro de API no campo com foco, estado na URL, barra lateral recolhida lembrada, layout de celular (36 checagens).
- Capturas: 7 telas × 2 temas = 14, com animações, cursor e barras de rolagem congelados e fontes aguardadas. Referências em `e2e/__screenshots__/<navegador>-<sistema>/`, uma pasta por ambiente porque fontes e suavização variam.
- **Tolerância estrita (0,02% dos pixels).** O primeiro valor (0,5%) deixou passar uma troca da cor da marca em 6 das 7 telas claras, já que botões e ícones ocupam pouca área; o mesmo ambiente reproduz 0,000%, então o limite pôde ser apertado. Com ele, a mesma troca falha nas 7 telas claras (e não nas escuras, cujo token é outro), e reverter volta a 14/14.
- Dependências de desenvolvimento novas: `puppeteer-core`, `pixelmatch`, `pngjs`. O script `npm test` da raiz continua só com API e frontend; os testes de navegador são `npm run test:e2e`.
- Documentação: `e2e/README.md`, `README.md`, `CLAUDE.md` e a regra de verificação em `.claude/rules/code.md`.
