# 21 a 38: conformidade com a especificação (Report.pdf)

**Depende de:** 20

Plano original e análise de lacunas: `docs/spec-gap-analysis.md`. Todo o trabalho foi feito em uma única branch,
`feature/spec-compliance`, a pedido do usuário, com um commit por grupo de tarefas e **sem merge em `main`**.

Vocabulário: a inscrição em turma se chama **inscrição** na interface e `enrollment` no código; **matrícula**
continua sendo o identificador da pessoa. A especificação usa "matrícula" para as duas coisas (decisão D1).

## Checklist

### 21: fundações
- [x] Relógio injetável (`ClockService`) para prazos e datas futuras
- [x] Erros com código (`MSG01` a `MSG03` e códigos de regra) no corpo da resposta
- [x] Parâmetros da instituição (média mínima, padrão 6) e trilha de auditoria (`audit_log`)
- [ ] Migrations (adiado: continua `synchronize` fora de produção; ver decisões)

### 22: calendário e semestres (REQ04, REQ05, UC05, UCs02)
- [x] Calendário com período, janela de inscrição, prazo de cancelamento/trancamento e prazo de notas
- [x] Semestre (rascunho, implantado, encerrado), único por ano e período (409)
- [x] Leitura para todos os perfis; escrita para a secretaria

### 23 e 24: turmas, aprovação, professor e horários (REQ06 a REQ08, UC06 a UC09, RN01, RN02, RN15)
- [x] Turma criada pela Administração ou solicitada por professor; nasce pendente
- [x] Aprovação exige professor e horário; rejeição exige motivo
- [x] Conflito de horário do professor (RN02) com `MSG03`; horários consecutivos são aceitos
- [x] Vagas nunca abaixo dos inscritos (RN15)

### 25: oferta e inscrição (REQ09, REQ10, UC01, UC02, RN03 a RN06)
- [x] Catálogo de turmas abertas com disciplina, professor, horário e vagas; disciplinas já aprovadas não são oferecidas
- [x] Inscrever-se registra uma **solicitação** (`requested`); as vagas só são decididas depois do fim do período de inscrição
- [x] Na solicitação: pré-requisitos aprovados (RN04, `MSG01`), sobreposição com outras solicitações/inscrições (RN05, `MSG03`), disciplina na matriz, disciplina já aprovada; **sem** verificação de vagas
- [x] Alocação (`POST /semesters/:id/allocate`, só a Administração, só depois do fim do período): confirma (`confirmed`) ou marca `not_allocated` (RN03)
- [x] Solicitação pode ser cancelada até a alocação; inscrição confirmada, cancelada ou trancada até o prazo do calendário (RN06)
- [x] Disciplinas aprovadas aparecem em uma seção somente leitura

### 26 e 27: notas e frequência (REQ11, REQ12, UC10, UC11, RN07 a RN09, RN12 a RN14)
- [x] Avaliações com peso, notas por aluno, média ponderada, resultado (aprovado, reprovado por nota, reprovado por falta)
- [x] Prazo de notas e liberação justificada pela Administração (RN14)
- [x] Frequência somente pelo professor responsável, nunca em data futura, só em dia de aula
- [x] Encerramento da turma grava o resultado, que alimenta os pré-requisitos

### 28 a 30: atividades, avisos e painel (REQ13 a REQ15, UC03, UC12, UC13, RN10, RN11, RD01)
- [x] Atividades com prazo, envio com arquivo (5 MB, tipos permitidos), reenvio substitui, atraso só se permitido
- [x] Avisos por turma ou da instituição, visíveis só a quem pertence
- [x] Painel acadêmico do aluno em uma única chamada

### 31 a 34: telas
- [x] Calendário, Turmas (lista e detalhe com Notas, Frequência, Atividades, Avisos), Inscrição, Painel, Avisos, Liberação de notas
- [x] Navegação por perfil atualizada (`docs/navigation.md`)

### 35 a 37: não funcionais
- [x] Relatórios de notas e frequência em CSV e PDF (RNF10)
- [x] Cabeçalhos de segurança, limite de tentativas de login, CORS por ambiente, validação do `JWT_SECRET` em produção, documentação OpenAPI em `/api/docs`, `GET /health` (RNF04, RNF08, RNF01)
- [x] Backup e restauração do SQLite, plano de recuperação e documento LGPD (`docs/operations.md`, `docs/lgpd.md`) (RNF05, RNF06)

### 38: desempenho e navegadores
- [x] Fluxos no navegador (Firefox) para inscrição, pré-requisito, painel, aprovação e telas do professor
- [ ] Teste de carga com milhares de alunos (não feito; ver decisões)
- [ ] Execução em Chromium, Edge e Safari (só há Firefox neste ambiente)

## Decisões tomadas sem perguntar

- **Uma branch só** (`feature/spec-compliance`) em vez de uma por tarefa, porque o pedido foi "crie uma nova branch"; sem merge.
- **D1:** código e regras do projeto mantidos; a interface diz "Inscrição".
- **D2:** a "Administração" da especificação é `admin` e `secretary`; só a gestão de funcionários continua exclusiva do admin.
- **D3:** versionamento da matriz curricular adiado (`GradeCurricular.versao`).
- **D4:** a turma é `class_groups` / `ClassGroup` no código.
- **D5:** escala 0 a 10, média ponderada, média mínima 6 em `institution_settings`.
- **D6:** o aluno só se inscreve em disciplinas da matriz do seu curso.
- **Inscrição em duas fases (pedido do usuário, depois da primeira versão):** a primeira versão confirmava na hora (seguindo o fluxo principal do CSU01); agora o clique só registra a solicitação e o resultado sai na alocação. Critério de desempate **definido por mim, a especificação não o traz**: (1) disciplina obrigatória na matriz do aluno antes de optativa, (2) ingresso mais antigo, (3) pedido mais cedo, (4) menor id. Trocar o critério é mudar `api/src/common/domain/allocation.ts`.
- A alocação roda **sozinha** quando o período termina (verificador a cada minuto, ao abrir as próprias inscrições e logo após uma viagem no tempo); `AUTO_ALLOCATE=false` desliga (e nos testes ela fica desligada por padrão). O botão *Alocar vagas* do calendário ficou como reserva, só liberado no dia seguinte ao fim do período; rodar de novo não faz nada. A primeira versão era só manual; passou a automática a pedido do usuário.
- A mensagem `MSG02` (sem vagas) deixou de aparecer na solicitação; o aluno vê "Não alocado" no resultado.
- **Viagem no tempo:** `GET/PUT/DELETE /clock` e o widget flutuante "Viagem no tempo" com calendário mensal (qualquer usuário logado, a pedido do usuário; o relógio é do servidor e vale para todos; desligada em produção, `TIME_TRAVEL=false` desliga em qualquer ambiente). O deslocamento fica só na memória do servidor. As telas passaram a usar a data **do servidor**, não a do navegador (isso também elimina a diferença de fuso: o servidor usa UTC).
- **D8:** o percentual de faltas é calculado sobre as aulas registradas até o momento.
- **D9:** a turma pertence a disciplina + semestre, não a um curso.
- **D10:** o professor pede a liberação de notas com justificativa; a Administração aprova com data limite, ou libera direto informando a data.
- **D11:** o autor e a Administração editam ou excluem avisos.
- Estados da turma: `pending`, `approved`, `rejected`, `closed` (não há `cancelled`).
- A frequência só pode ser registrada em dias da semana em que a turma tem aula e dentro do período do semestre.
- Os dados de demonstração do semestre (`api/src/seed/academic-demo.ts`) usam datas relativas a hoje e podem ser desligados com `SEED_ACADEMIC_DEMO=false` (os testes desligam).
- O PDF é gerado por um escritor mínimo próprio (sem dependência nova); o OpenAPI lista as rotas sem esquemas de corpo.
- **Migrations não foram feitas.** Antes de qualquer implantação em produção, elas são necessárias, pois `synchronize` fica desligado lá.
- O teste de carga não foi criado; a concorrência da última vaga e o tempo do painel (menos de 3 s) são verificados por testes e2e.

## Correções de segurança feitas no caminho (fora do escopo original, mas ligadas ao RNF04 e RNF05)

- `PUT /auth/password/reset` era público e trocava a senha de **qualquer** conta; agora só define a senha de quem ainda não tem uma (primeiro acesso).
- `GET /users/:cpf/email` era público e devolvia o e-mail de qualquer CPF; agora exige secretaria ou admin.

## Pontos em aberto

- Não há tela para a média mínima (`PUT /settings`) nem para a trilha de auditoria (`GET /audit`): só a API.
- `GET /auth/access/:identifier` continua público (a especificação define o login em dois passos) e devolve o nome; tem limite de tentativas.
- Inconsistências da própria especificação estão listadas em `docs/spec-gap-analysis.md`, seção 8.
