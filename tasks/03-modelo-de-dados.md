# 03 — Modelo de dados

**Depende de:** 01

## Objetivo

Definir e documentar as entidades do domínio acadêmico antes de implementar as APIs.

## Princípios

- `users` é a **identidade** de todas as pessoas (administrador, secretaria, professor, aluno). Guarda só dados comuns e credenciais.
- Cada perfil é uma **extensão 1:1** de `users` (`staff`, `teachers`, `students`), com `userId` como PK/FK.
- O perfil **não é gravado**: ele é derivado da existência da linha na tabela de extensão. Isso elimina a inconsistência "perfil professor sem registro em `teachers`".
- Um usuário pode ter **vários perfis** (ex.: professor e aluno de mestrado).
- Um usuário **sem nenhum perfil** é válido (ver "Usuário sem vínculo").

## Entidades

### User (Usuário)
`id` (PK), `cpf` (único, 11 dígitos), `registrationNumber` (único, opcional — matrícula usada no login; 10 dígitos, `AAAA` + 6 sequenciais; `CHECK` de formato e de tamanho ≠ 11), `name`, `email` (único), `passwordHash` (nulo até o primeiro acesso), `active`

### Staff (Funcionário administrativo)
`userId` (PK/FK → User), `role` (`admin` | `secretary`, com `CHECK`), `status` (ativo/inativo)
- Um papel administrativo por pessoa. Se um dia forem necessários dois, a chave vira (`userId`, `role`).

### Teacher (Professor)
`userId` (PK/FK → User), `departmentId` → Department, `title` (graduado/especialista/mestre/doutor), `status`

### Student (Aluno)
`userId` (PK/FK → User), `courseId` → Course, `entryYear`, `status` (ativo/trancado/formado/desligado)
- A matrícula do aluno é o `registrationNumber` do `User` (não existe "RA" no sistema); a tarefa 04 define a geração.

### Department (Departamento)
`id`, `name` (único), `code` (único, ex.: `DCC`)

### Course (Curso)
`id`, `name`, `code` (único), `departmentId` → Department, `totalSemesters`, `status` (ativo/inativo)

### Subject (Disciplina)
`id`, `code` (único), `name`, `workloadHours`, `description` (opcional)

### CurriculumItem (Matriz curricular)
`id`, `courseId` → Course, `subjectId` → Subject, `semester`, `mandatory` (obrigatória/optativa)
- Único por (`courseId`, `subjectId`)

### SubjectPrerequisite (Pré-requisito)
`subjectId` → Subject, `prerequisiteId` → Subject
- Chave composta; proibir auto-referência e ciclos

## Perfis efetivos

Calculados no login e enviados no JWT:

```
perfis = [staff.role se existir]
       + ['teacher' se existe linha em teachers]
       + ['student' se existe linha em students]
```

## Usuário sem vínculo

Usuário em `users` sem linha em `staff`, `teachers` ou `students`:

- **Pode fazer login** (CPF ou matrícula + senha), inclusive definir a senha no primeiro acesso.
- Lista de perfis vazia → `RolesGuard` retorna 403 em tudo, exceto `/auth/me` e troca de senha.
- Frontend mostra uma tela única: "Seu cadastro ainda não possui vínculo. Procure a secretaria."
- Ao encerrar um vínculo, **inativar** (`status`) em vez de apagar a linha do perfil.
- Não existe `POST /users` genérico para a secretaria: o usuário nasce junto do perfil, em transação (`/students`, `/teachers`, `/staff`). Um endpoint de criação sem vínculo, se existir, é exclusivo do administrador.
- Uma consulta lista os órfãos (`users` sem linha em nenhuma das três tabelas), para a tela de administração e para teste de integridade.

## Contexto

- `api/sql/schema.sql` e entidades TypeORM em `api/src/features/*/entities/`
- Padrão atual: pasta por feature com `dto/`, `entities/`, controller, service, repository, module
- A entidade `User` atual usa `cpf` como PK e `roleId`; ambos mudam nesta tarefa

## Checklist

- [x] Revisar as entidades acima e ajustar campos (mantidos os campos propostos; telefone e data de nascimento ficam para quando forem necessários)
- [x] Migrar `User`: PK `id`, `cpf` único, adicionar `registrationNumber` e `active`. **`roleId` fica transitório e é removido na tarefa 02** (decisão: a 02 o substitui pelos perfis derivados; removê-lo aqui quebraria auth e frontend)
- [x] Criar entidades `Staff`, `Teacher`, `Student` com `userId` como PK/FK (mais `Department`, `Course`, `CurriculumItem`, `Subject`, `SubjectPrerequisite` e `RegistrationSequence`)
- [x] Definir regras de remoção: ver `docs/data-model.md` (perfil `CASCADE` com o usuário; departamento, curso e disciplina em uso `RESTRICT`; encerrar vínculo = inativar)
- [x] Formato da matrícula definido: `AAAA` + 6 dígitos sequenciais por ano (10 dígitos), sem colisão com CPF (11 dígitos)
- [x] Criar `CHECK` no schema: `registrationNumber` só dígitos, tamanho 10
- [x] Sequencial por ano controlado por **tabela de contadores** `registration_sequences` (decisão: um número nunca é reutilizado); a geração é implementada na tarefa 04
- [x] Atualizar `api/sql/schema.sql` com tabelas, FKs, `CHECK` e índices
- [x] Documentar o diagrama ER (Mermaid) em `docs/data-model.md`
- [x] Banco criado por `synchronize` fora de produção; `schema.sql` é documentação mantida à mão (decisão). **Ainda não há migrations**: criar antes de qualquer deploy em produção

## Critérios de aceite

- API sobe com o novo schema e banco novo criado do zero.
- Todas as FKs, unicidades e o `CHECK` de `staff.role` estão definidos no banco.
- Diagrama ER versionado no repositório.
- Consulta de usuários órfãos disponível (`UsersRepository.findWithoutProfile`).
