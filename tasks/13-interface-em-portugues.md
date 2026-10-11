# 13 — Interface e mensagens em português

**Depende de:** 09, 10, 11, 12

## Objetivo

Cumprir a regra de idioma do projeto (`.claude/rules/language.md`): a interface e as mensagens de erro que chegam ao usuário ficam em português (pt-BR). Esta tarefa não estava no roteiro original; surgiu porque telas herdadas do sistema de requisições e todas as mensagens de erro da API ainda estavam em inglês.

## Contexto

- API: exceções do Nest em `api/src/features/**` e as mensagens padrão do `class-validator`
- Frontend: `login`, `register-users`, `ProfileModal`, `UserFormModal`, `Header`, `Sidebar`, `Footer`, `ErrorBoundary`, `useApi`

## Checklist

- [x] Traduzir as mensagens de domínio da API (não encontrado, duplicidade, regras de exclusão, permissões)
- [x] Traduzir os erros de validação: `exceptionFactory` do `ValidationPipe` com rótulos de campo em português
- [x] Traduzir os textos herdados do frontend (login, cadastro de usuários, perfil, cabeçalho, menu, rodapé, erro)
- [x] Atualizar os testes que verificavam mensagens e cobrir as mensagens em português

## Critérios de aceite

- Nenhuma mensagem de erro retornada pela API ao usuário final está em inglês.
- Nenhum texto visível na interface está em inglês.
- Logs internos e identificadores de código continuam em inglês.

## Decisões tomadas na implementação

- Os erros de validação mantêm o formato `message: string[]`, então o cliente não muda; os campos usam um dicionário de rótulos (`cpf` → "CPF", `courseId` → "curso", ...).
- Mensagens de autenticação ficam genéricas ("CPF, matrícula ou senha inválidos") para não revelar se o CPF existe.
- Fora do escopo: mensagens de log, nomes de variáveis e a documentação técnica (README), que seguem em inglês conforme a regra.
