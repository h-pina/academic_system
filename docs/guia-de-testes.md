# Guia de testes manuais dos fluxos

Roteiro para conferir, na interface, as regras da especificação (`Report.pdf`). Cada cenário diz **quem entra**,
**o que fazer** e **o que deve acontecer**. As regras citadas (RN, REQ, UC, MSG) são as da especificação.

## 1. Preparação

```bash
npm install
cp api/.env.example api/.env            # defina JWT_SECRET
cp frontend/.env.example frontend/.env.local
npm run dev:fresh                        # apaga o banco, recria e popula com os dados de demonstração
```

- Interface: http://localhost:3005. API: http://localhost:3001 (documentação em `/api/docs`, saúde em `/health`).
- Para recomeçar do zero a qualquer momento: pare o servidor e rode `npm run dev:fresh`.
- Os dados de demonstração usam datas **relativas a hoje**. O semestre atual já está em progresso e o período de
  inscrição está aberto (de 30 dias atrás até 30 dias à frente).

### Viagem no tempo (para testar prazos)

Os prazos do calendário (fim das inscrições, cancelamento, notas) dependem da data. Para testá-los sem esperar
nem editar o calendário, **qualquer usuário logado** (de qualquer perfil, até sem vínculo) pode mover o relógio
**do servidor** pelo widget flutuante:

1. No canto inferior direito da tela há uma bolinha com um relógio (**Viagem no tempo**). Clique para abrir.
2. Aparece um **calendário mensal**: o dia atual do sistema tem um contorno, os pontos marcam os prazos do
   semestre em progresso (início e fim das inscrições, prazo de cancelamento, prazo de notas; passe o mouse ou
   use o leitor de tela para ver qual é) e as setas trocam o mês.
3. Clique no dia desejado e em **Ir para dd/mm/aaaa**. A página recarrega na nova data.
4. Atalhos no mesmo painel: **−1 dia**, **+1 dia**, **+7 dias**, **Fim das inscrições**, **Depois do prazo de
   cancelamento**, **Depois do prazo de notas** e, quando a data está simulada, **Voltar ao tempo real**.
5. Enquanto a data é simulada, **todos** os perfis veem a bolinha âmbar com um ponto vermelho (passe o mouse: "Data simulada: dd/mm/aaaa"), e as telas e a
   API usam essa data.

Observações:
- **O relógio é do servidor, não do seu navegador**: se você viajar no tempo, todos os usuários e janelas passam a
  ver a nova data (por isso a bolinha âmbar aparece para todos).
- O tempo continua passando a partir da data escolhida (não fica congelado).
- A data simulada fica só na memória do servidor: **reiniciar a API volta ao tempo real** (e a API reinicia sozinha
  quando você altera o código no `npm run dev`).
- As viagens ficam na auditoria (`clock.travel`), e os registros criados com a data simulada guardam essa data.
- É uma ferramenta de desenvolvimento: **desligada em produção**. Para forçar, use `TIME_TRAVEL=true|false` no
  `api/.env`. Também há `GET /clock` (data do servidor), `PUT /clock` com `{ "date": "2026-03-01" }` ou
  `{ "days": 7 }` e `DELETE /clock` para voltar ao real (todos exigem estar logado).

### Contas (senha `password123`)

Entre com o CPF ou, quando houver, com a matrícula.

| Perfil | Nome | CPF | Matrícula |
|--------|------|-----|-----------|
| Administrador | Alice Admin | `12345678909` | |
| Secretaria | Bob Secretary | `98765432100` | |
| Professor (CC101, CC102) | Carol Teacher | `11122233396` | |
| Professor (MAT101, MAT103) | Frank Teacher | `12121212108` | |
| Professor (pediu a turma CC201) | Grace Teacher | `22233344405` | |
| Aluno, Ciência da Computação | Erin Student | `11144477735` | `2026000001` |
| Aluno, Ciência da Computação | Ivan Student | `44455566619` | `2025000002` |
| **Aluna para testar todos os casos de inscrição** (CC) | **Nina Tester** | `10020030088` | `2025000003` |
| Aluno, Matemática | Judy Student | `55566677720` | `2026000002` |
| Aluno trancado | Karl Locked | `66677788830` | `2024000001` |
| Aluno formado | Liam Graduated | `77788899941` | `2020000001` |
| Professor e aluno | Heidi Both | `33344455508` | `2025000001` |
| Sem vínculo | Mallory Unlinked | `88899911193` | |
| Sem senha ainda | Dave Pending | `45678912364` | |

Dica: use uma janela anônima por perfil, ou saia e entre de novo, para alternar entre as contas. A viagem no tempo vale para todos, pois é o relógio do servidor.

### O que os dados de demonstração contêm

- Semestre atual (ano/2) **em progresso**; semestre do ano passado **encerrado**.
- Turmas do semestre atual: **CC101** (Carol, seg e qua 08:00-10:00), **CC102** (Carol, ter 08:00-10:00),
  **MAT101** (Frank, ter 10:00-12:00), **MAT103** (Frank, qui 10:00-12:00) e **CC201** (Grace, sex 14:00-16:00,
  **pendente de aprovação**).
- CC101 do ano passado (encerrada): **Ivan foi aprovado** (nota 8) e **Erin foi reprovada** (nota 4,5).
- Inscritos hoje: Erin e Heidi em CC101, Judy em MAT101.
- CC101 do semestre atual já tem as avaliações *Prova 1* (peso 3) e *Trabalho prático* (peso 2), notas de Erin
  (8 e 9,5, média 8,6) e de Heidi (só a prova, 6,5), 4 aulas registradas (Heidi faltou a uma), uma atividade
  com prazo daqui a 14 dias e dois avisos.

## 2. Aluno: inscrição em duas fases (UC01, UC02, RN01 a RN06)

A inscrição **não confirma a vaga**: o clique registra uma **solicitação**, e as vagas são decididas
**automaticamente** quando o período de inscrição termina (alocação).

### 2.1 Solicitar inscrição
**Judy** → *Inscrição em turmas*.
1. O aviso verde diz que as inscrições estão abertas e que inscrever-se registra uma solicitação.
2. Na lista de turmas abertas, veja disciplina, professor, horário e vagas (RU02). **MAT103** deve aparecer.
3. Clique em **Inscrever-se** em MAT103.

Esperado: mensagem "Solicitação registrada…"; em *Minhas inscrições*, MAT103 com situação **Solicitada** e o
botão **Cancelar solicitação**; na lista de turmas, MAT103 passa a mostrar o selo "Solicitada" e "1 solicitação(ões)".

### 2.2 Cancelar uma solicitação
Ainda como Judy, clique em **Cancelar solicitação** e confirme. A linha some do que está ativo e o contador de
solicitações volta a 0. Solicite de novo para os próximos cenários.

### 2.3 Pré-requisito não atendido (RN04, MSG01)
**Erin** → *Inscrição em turmas* → **Inscrever-se** em CC102.
Esperado: erro "Pré-requisito não atendido para a disciplina selecionada. Pendente: CC101." (ela foi reprovada em
CC101 no ano passado).

**Ivan** pede a mesma turma CC102: **funciona**, porque foi aprovado em CC101.

### 2.4 Conflito de horário (RN05, MSG03)
Peça a Bob (cenário 3.2) uma turma nova no mesmo horário de uma solicitação do aluno, ou peça como Erin uma turma
que bata com CC101 (seg/qua 08:00-10:00).
Esperado: "Existe conflito de horário com outra turma." com o nome da turma em conflito. Turmas em horários
**consecutivos** (uma termina às 10:00, outra começa às 10:00) são aceitas.

### 2.5 Disciplina já aprovada não aparece (e *Disciplinas aprovadas*)
**Ivan** → *Inscrição em turmas*:
- **CC101 não é oferecida** (ele já passou).
- Abaixo de *Minhas inscrições* aparece a seção **Disciplinas aprovadas**, somente leitura, com a média final (8) e
  sem botões.

### 2.6 Alunos que não podem solicitar
- **Karl** (trancado) ou **Liam** (formado): ao tentar, erro "A situação acadêmica do aluno não permite a inscrição".
- Professor, secretaria e administrador **não** têm o menu *Inscrição em turmas* e recebem 403 na API.

### 2.9 Uma aluna para todos os casos: Nina Tester (`10020030088`)
Nina (Ciência da Computação, ingresso 2025) já foi **aprovada em CC101** e **nunca cursou MAT101**. No catálogo
há, além das turmas de antes, **MAT102**, **MAT104** e **STA101** (as duas últimas com **1 vaga**, já disputadas).
Entre como Nina e faça, nesta ordem:

| # | Caso | O que fazer | Esperado |
|---|------|-------------|----------|
| 1 | Pré-requisito satisfeito + inscrição | Inscrever-se em **CC102** (exige CC101) | Fica **Solicitada** |
| 2 | Cancelamento | Em *Minhas inscrições*, **Cancelar solicitação** em CC102 | A solicitação some; CC102 volta ao catálogo |
| 3 | Pré-requisito não satisfeito | Inscrever-se em **MAT102** (exige MAT101) | Erro de pré-requisito (MSG01), sem solicitação |
| 4 | Solicitação que será aprovada | Inscrever-se em **MAT104** (1 vaga; Erin, ingresso 2026, já pediu) | **Solicitada** |
| 5 | Solicitação que será recusada | Inscrever-se em **STA101** (1 vaga; Ivan, ingresso 2025, já pediu antes) | **Solicitada** |
| 6 | Resultado | Widget *Viagem no tempo* → **Fim das inscrições**, recarregar | **MAT104: Cursando** (Nina vence Erin pelo ingresso mais antigo); **STA101: Não alocado** (Ivan pediu primeiro, mesmo ingresso) |
| 7 | Progresso | Abrir **Meu curso** | CC101 **Aprovada**, MAT104 **Em andamento**, STA101 e demais **Não cursada** |

Depois do fim do período, a tela de inscrição mostra só *Minhas inscrições*. Para repetir, use
**Voltar ao tempo real** e `npm run dev:fresh` (as solicitações ficam gravadas).

### 2.8 Meu curso (curso, progresso e matriz)
Como **Ivan**, abra **Meu curso** (não existe mais o menu *Minha matriz*; o endereço antigo redireciona para cá).
Esperado: os dados do curso, o bloco **Meu progresso** (carga horária cursada, restante, em andamento e % concluído)
e a **Minha matriz** por semestre, com um marcador em cada disciplina: **Aprovada** (CC101 e as demais já
aprovadas), **Em andamento** (solicitada ou cursando agora) ou **Não cursada**. A carga cursada soma só as aprovadas.
O botão **Ver lista de disciplinas** abre a segunda tela (busca por código ou nome, com um link para voltar);
não há mais o menu *Disciplinas do curso*.

### 2.7 Período fechado (E04)
Depois do cenário 4.3 (período encerrado) os botões **Inscrever-se** ficam desabilitados e o aviso fica amarelo.

## 3. Secretaria / Administração: calendário e turmas (UC04 a UC09)

### 3.1 Calendário e semestre (UC05, UC06, REQ04, REQ05)
**Bob** → *Calendário acadêmico*.
1. **Novo calendário** com datas inconsistentes (fim antes do início; inscrições fora do período): o formulário
   aponta o campo errado e não envia.
2. Cadastre um calendário válido. Edite-o pelo lápis.
3. **Novo semestre** (ano e período): nasce como *Rascunho*. Repetir o mesmo ano/período dá erro de semestre
   duplicado.
4. **Implantar** libera as turmas; **Encerrar** impede novas turmas.

Todos os perfis veem o calendário (UCs02), mas só a secretaria vê os botões de escrita.

### 3.2 Criar turma e aprovar (UC06, UC08, RN01)
**Bob** → *Turmas* → **Nova turma**: escolha semestre, disciplina, professor, vagas e horários.
- A turma nasce **Pendente** e **não** aparece em *Inscrição em turmas* dos alunos.
- Aprovar sem professor ou sem horário: erro "Dados incompletos da turma…".
- **Aprovar** (botão na lista ou na página da turma) libera a turma; agora aparece para os alunos.
- **Rejeitar** exige um motivo; a turma fica *Rejeitada* e some da oferta.

Teste com os dados prontos: filtre por **Pendentes**, abra **CC201 (Grace)** e aprove-a.

### 3.3 Conflito do professor (RN02, MSG03)
Crie uma turma com **Carol** na segunda-feira, 09:00-11:00 (CC101 dela é 08:00-10:00).
Esperado: "Existe conflito de horário com outra turma. O professor já ministra Introduction to Programming…".
Se mudar o horário para 10:00-12:00, funciona.

### 3.4 Editar vagas, professor e horários (REQ07, REQ08, RN15)
Na página da turma → **Editar vagas, professor e horários**. Reduzir as vagas abaixo do número de inscritos
confirmados dá erro (RN15). Trocar o professor ou o horário reaplica a verificação de conflito.

### 3.5 Solicitação de turma por professor (UC09)
**Frank** → *Turmas* → **Solicitar turma**: disciplina, vagas e horário sugerido.
- A turma vai para *Pendente* e a Administração a aprova (cenário 3.2).
- Sugerir um horário que bata com outra turma dele dá o erro de conflito.

## 4. Alocação das vagas (RN03)

A alocação **acontece sozinha** assim que o período de inscrição termina: um verificador roda a cada minuto, roda
quando alguém abre as próprias inscrições e roda **na hora** em que você viaja no tempo para depois do fim do
período. Ninguém precisa clicar em nada.

### 4.1 Gerar disputa por vagas
Como **Bob**, edite a turma **MAT103** (cenário 3.4) e deixe **1 vaga**. Como alunos de Matemática (**Judy** e
**Heidi**) peça MAT103. A página da turma (*Turmas* → MAT103, aba *Resumo*) mostra
"2 solicitação(ões) aguardando a alocação", e a oferta dos alunos mostra "2 solicitação(ões)" para 1 vaga.

### 4.2 Antes do fim do período
Nada é decidido: as solicitações seguem **Solicitada**. Viajar para o **último dia** das inscrições (o ponto do
calendário "Último dia das inscrições") também não decide nada. Na página do calendário (Bob), o botão
**Alocar vagas** fica **desabilitado**.

### 4.3 Passar do fim do período
Use o widget **Viagem no tempo** e escolha **Fim das inscrições** (o dia seguinte ao último dia).

Esperado, **sem clicar em mais nada**: ao recarregar, as solicitações já têm resultado.

Com o período encerrado, a tela *Inscrição em turmas* do aluno mostra **só** *Minhas inscrições* do semestre
(solicitações, vagas confirmadas e não alocadas): as seções *Turmas abertas* e *Disciplinas aprovadas* somem.

Critério (definido neste projeto, a especificação não o traz), em cada turma e nesta ordem:
1. disciplina **obrigatória** na matriz do aluno, antes das optativas;
2. **ingresso mais antigo** (Heidi, 2025, antes de Judy, 2026);
3. quem **pediu primeiro**.

Em MAT103 com 1 vaga: **Heidi** fica *Cursando*; **Judy** fica **Não alocado**.

### 4.4 Depois da alocação
- Quem foi confirmado está na lista de alunos da turma (página da turma), no painel e pode receber notas.
- Quem ficou como *Não alocado* não tem botões.
- Novas solicitações: erro "O período de inscrição está fechado." e o aviso da tela fica amarelo.
- Cancelar/trancar uma inscrição **confirmada** continua possível até o prazo de cancelamento e trancamento do
  calendário (RN06). Depois dele: erro "O prazo para cancelamento ou trancamento… terminou." (use **Viagem no
  tempo → Depois do prazo de cancelamento** para ver; o botão de cancelar some).
- A trilha de auditoria registra a alocação com `automatic: true`.

### 4.5 Reserva manual
O botão **Alocar vagas** (calendário, Bob) continua existindo para o caso de a alocação automática estar desligada
(`AUTO_ALLOCATE=false` no `api/.env`). Com ela ligada, depois do fim do período ele só responde "Não havia
solicitações pendentes."

## 5. Professor: notas, frequência, atividades e avisos

**Carol** → *Turmas* → abra **CC101 T01** (clique no nome). As seções são *Resumo*, *Notas*, *Frequência*,
*Atividades* e *Avisos*.

### 5.1 Notas (UC10, REQ11, RN07, RN12)
Aba **Notas**:
1. A tabela mostra Erin (8 e 9,5, média 8,6, *Aprovado*) e Heidi (só a prova, em andamento).
2. Digite a nota do *Trabalho prático* da Heidi (ex.: 7) e **Salvar notas**. Valor acima de 10 ou negativo é
   recusado.
3. **Nova avaliação** cria outra avaliação com peso; as notas ficam em branco até serem lançadas.
4. A média é ponderada, de 0 a 10; média mínima 6 (`Aprovado` / `Reprovado por nota`).

**Frank** não consegue abrir/alterar as notas da turma de Carol (403), e alunos nem veem o menu *Turmas*.

### 5.2 Frequência (UC11, REQ12, RN08, RN09, RN13)
Aba **Frequência** (somente a professora responsável marca; a secretaria só consulta):
1. A data não aceita o futuro.
2. Escolha uma segunda ou quarta passada, marque as ausências e **Registrar frequência**.
3. Uma data em que a turma não tem aula (ex.: terça) dá erro "A turma não tem aula na data informada."
4. A coluna de faltas mostra o percentual; **acima de 25%** aparece "acima do limite" (reprovação por falta, mesmo
   com nota alta). Exatamente 25% ainda é permitido.
5. É possível corrigir uma data passada (marcar de novo e registrar).

### 5.3 Prazo de notas e liberação (RN14, UC10 E01)
1. Use **Viagem no tempo → Depois do prazo de notas**.
2. **Carol**, aba *Notas*: aparece o aviso de prazo encerrado e os campos ficam bloqueados.
3. **Solicitar liberação do prazo** com justificativa (mínimo 10 caracteres).
4. **Bob** → *Liberação de notas*: **Liberar** (informe até quando) ou **Recusar**.
5. Liberado, Carol volta a lançar notas até a data informada.

### 5.4 Encerrar a turma (resultado final)
Aba *Notas* → **Encerrar turma** (todos precisam ter todas as notas; se faltar, a mensagem lista quem).
Efeito: cada aluno recebe **Aprovado**, **Reprovado por nota** ou **Reprovado por falta**, e a turma fica
*Encerrada*.

Encadeamento com o pré-requisito: se **Erin** foi aprovada, ela agora consegue pedir **CC102** (que exigia CC101)
enquanto o período de inscrição estiver aberto (RN04).

### 5.5 Atividades (UC12, REQ13, RN10)
Aba **Atividades** → **Nova atividade** (título, descrição, prazo no futuro; opcionalmente "aceitar com atraso
até"). **Envios** mostra quem entregou e permite baixar o arquivo.

Como **Erin**, em *Painel acadêmico* → atividade → **Enviar**:
- Texto, arquivo (PDF, imagem, texto, ZIP ou DOCX, até 5 MB) ou ambos. Sem nada, erro.
- Enviar de novo **substitui** o envio anterior.
- Depois do prazo: recusado, a menos que o professor tenha permitido atraso (e dentro do limite); nesse caso fica
  "Enviada com atraso".

### 5.6 Relatórios (RNF10)
Nas abas *Notas* e *Frequência*, os botões **CSV** e **PDF** baixam o relatório (o CSV abre no Excel, com acentos
corretos). Só o professor responsável e a secretaria podem baixar.

### 5.7 Avisos (UC13, REQ14, RN11, RN12)
- **Carol** → aba *Avisos* da CC101 → **Novo aviso**: Erin e Heidi o veem em *Avisos* e no painel; **Judy** não.
- Carol não consegue publicar para a instituição inteira nem para a turma de Frank.
- **Bob** → *Avisos*: **Novo aviso** para "Toda a instituição" ou para uma turma; todos os perfis veem os gerais.
- O autor e a Administração editam e excluem.

## 6. Aluno: painel acadêmico (UC03, REQ15, RN13, RD01)
**Erin** → *Painel acadêmico*. Para cada turma em que está confirmada: notas com a média, faltas e percentual
(barra), atividades com situação e botão de envio, e avisos da turma. A CC101 do ano passado aparece com o resultado
**Reprovado por nota** (4,5). O painel carrega em menos de 3 segundos. Categorias vazias mostram o texto
correspondente, sem derrubar a tela. Alunos só veem os próprios dados.

## 7. Acesso e segurança (RNF04, RNF05)

| O que testar | Esperado |
|--------------|----------|
| Aluno abre `/app/classes`, `/app/students`, `/app/reopenings` | Redirecionado para `/app` |
| Professor abre `/app/reopenings` ou `/app/enrollment` | Redirecionado |
| **Mallory** entra | Aviso "Cadastro sem vínculo"; só *Meus dados* abre |
| **Dave** (sem senha): digita o CPF e define a senha | Primeiro acesso funciona; depois a mesma tela não troca a senha de quem já tem |
| `PUT /auth/password/reset` de uma conta que já tem senha | 403 |
| `GET /users/<cpf>/email` sem login ou como aluno | 401 / 403 |
| Muitas senhas erradas seguidas (com `LOGIN_RATE_LIMIT=3` no `api/.env`) | 429 "Muitas tentativas…" |

## 8. Itens técnicos

```bash
curl localhost:3001/health                        # {"status":"ok","database":"up",...}
npm run backup --workspace api                    # gera data/backups/app-AAAAMMDD-HHMMSS.sqlite e valida
npm run restore --workspace api -- <arquivo>      # com o servidor parado
```

A trilha de auditoria (`GET /api/audit`, só administrador, pela documentação em `/api/docs`) registra solicitações,
alocações, notas, frequência, liberações, relatórios e logins que falharam (com o identificador mascarado).

## 9. Testes automáticos

```bash
npm run typecheck && npm run lint
npm test                 # API (e2e com banco em memória) e frontend
npm run test:e2e         # navegador (Firefox) e comparação de telas; pare o `npm run dev` antes
```

O e2e usa as portas 3001 e 3005 e um banco descartável, por isso o servidor de desenvolvimento precisa estar
parado. Se uma comparação de tela mudar de propósito, atualize as referências com `npm run test:visual:update`.

## 10. Roteiro rápido (10 minutos)

1. `npm run dev:fresh`.
2. Judy solicita MAT103 (2.1); Erin tenta CC102 e recebe o erro de pré-requisito (2.3).
3. Bob aprova a CC201 (3.2) e cria o conflito de Carol (3.3).
4. Carol lança a nota do Trabalho da Heidi e registra uma frequência (5.1 e 5.2).
5. Erin abre o painel (6) e envia a atividade (5.5).
6. Avance o tempo até o fim das inscrições (widget **Viagem no tempo**, 4.3); as vagas são alocadas sozinhas; confira o resultado como Judy.
7. Avance até depois do prazo de notas e, como Carol, veja o bloqueio (5.3). Volte ao tempo real ao terminar.
