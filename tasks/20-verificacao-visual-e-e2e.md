# 20 — Verificação visual e testes de navegador

**Depende de:** 18, 19

## Objetivo

Proteger o resultado visual e os fluxos principais com testes executados em navegador real, para que mudanças futuras não quebrem a aparência nem o uso.

## Contexto

- Na fase 1 os fluxos foram verificados por um script avulso (Firefox via Puppeteer, fora do repositório). Esta tarefa o traz para dentro do projeto.
- O navegador baixado pelo Playwright não funcionou neste ambiente; a suíte deve aceitar um executável configurável (`BROWSER_PATH`).

## Checklist

- [ ] Suíte `e2e/` na raiz: sobe API (banco temporário com seed) e frontend, executa os fluxos e encerra
- [ ] Fluxos: login por CPF e por matrícula, cadastro de aluno, erro de duplicidade, matriz e pré-requisito com ciclo, aluno sem acesso a módulo restrito, usuário sem vínculo, troca de tema
- [ ] Capturas de tela das telas principais, nos temas claro e escuro, em larguras de celular e desktop
- [ ] Comparação com imagens de referência versionadas (`pixelmatch`) com tolerância configurável e relatório das diferenças
- [ ] Script para atualizar as referências de forma explícita (`npm run test:visual -- --update`)
- [ ] Documentar como rodar localmente e o que fazer quando o navegador não está disponível (testes são pulados com aviso)
- [ ] Script `npm run test:e2e` na raiz

## Critérios de aceite

- A suíte passa em ambiente limpo com o navegador configurado.
- Uma mudança intencional de cor ou espaçamento faz o teste visual falhar e mostra a diferença.
- Documentação em `README.md` e `CLAUDE.md`.

## Decisões

- Dependências de desenvolvimento novas: `puppeteer-core`, `pixelmatch`, `pngjs`.
- A comparação visual usa o mesmo navegador e a mesma fonte para evitar diferenças falsas entre máquinas; as referências ficam em `e2e/__screenshots__/`.
