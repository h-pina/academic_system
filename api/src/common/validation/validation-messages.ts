import { ValidationError } from 'class-validator';

/** Portuguese names for the fields that clients send. */
const FIELD_LABELS: Record<string, string> = {
  cpf: 'CPF',
  name: 'nome',
  email: 'e-mail',
  password: 'senha',
  newPassword: 'nova senha',
  currentPassword: 'senha atual',
  identifier: 'CPF ou matrícula',
  courseId: 'curso',
  departmentId: 'departamento',
  subjectId: 'disciplina',
  entryYear: 'ano de ingresso',
  status: 'situação',
  title: 'titulação',
  role: 'papel',
  code: 'código',
  totalSemesters: 'número de semestres',
  workloadHours: 'carga horária',
  description: 'descrição',
  semester: 'semestre',
  mandatory: 'obrigatoriedade',
  prerequisiteIds: 'pré-requisitos',
  calendarId: 'calendário',
  semesterId: 'semestre letivo',
  classId: 'turma',
  teacherId: 'professor',
  enrollmentId: 'inscrição',
  assessmentId: 'avaliação',
  year: 'ano',
  term: 'período',
  seats: 'vagas',
  weekday: 'dia da semana',
  startTime: 'horário de início',
  endTime: 'horário de término',
  startDate: 'data de início',
  endDate: 'data de término',
  enrollmentStart: 'início das inscrições',
  enrollmentEnd: 'fim das inscrições',
  withdrawalDeadline: 'prazo de cancelamento e trancamento',
  gradesDeadline: 'prazo de lançamento de notas',
  weight: 'peso',
  maxScore: 'nota máxima',
  value: 'valor',
  dueAt: 'prazo de entrega',
  allowLateUntil: 'aceite com atraso até',
  body: 'texto',
  reason: 'motivo',
  justification: 'justificativa',
  openUntil: 'liberado até',
  date: 'data',
  present: 'presença',
  answerText: 'resposta',
  minPassingGrade: 'média mínima',
  schedules: 'horários',
  page: 'página',
  pageSize: 'tamanho da página',
  q: 'busca',
  sort: 'ordenação',
  order: 'sentido da ordenação',
};

const CONSTRAINT_MESSAGES: Record<string, (field: string) => string> = {
  isString: (field) => `${field} deve ser um texto`,
  minLength: (field) => `${field} é curto demais`,
  maxLength: (field) => `${field} é longo demais`,
  isEmail: (field) => `${field} deve ser um e-mail válido`,
  isInt: (field) => `${field} deve ser um número inteiro`,
  isNumber: (field) => `${field} deve ser um número`,
  min: (field) => `${field} está abaixo do mínimo permitido`,
  max: (field) => `${field} está acima do máximo permitido`,
  isIn: (field) => `${field} tem um valor inválido`,
  isBoolean: (field) => `${field} deve ser verdadeiro ou falso`,
  isArray: (field) => `${field} deve ser uma lista`,
  arrayMaxSize: (field) => `${field} tem itens demais`,
  arrayUnique: (field) => `${field} não pode ter itens repetidos`,
  matches: (field) => `${field} tem um formato inválido`,
  isCpf: (field) => `${field} deve ser um CPF válido`,
  isLoginIdentifier: () => 'Informe um CPF ou uma matrícula válidos',
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One validation failure: the offending property and a message for the UI. */
export interface FieldError {
  /** Dotted path of the property, e.g. `cpf` or `items.0.name`. */
  field: string;
  message: string;
}

/**
 * Flattens class-validator errors into one entry per failure, with the
 * property it belongs to, so a form can show each message on its field.
 */
export function translateFieldErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  const result: FieldError[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const field = FIELD_LABELS[error.property] ?? error.property;

    for (const key of Object.keys(error.constraints ?? {})) {
      if (key === 'whitelistValidation') {
        result.push({ field: path, message: `O campo "${path}" não é permitido` });
        continue;
      }
      const build =
        CONSTRAINT_MESSAGES[key] ?? ((name: string) => `${name} é inválido`);
      result.push({ field: path, message: capitalize(build(field)) });
    }

    if (error.children?.length) {
      result.push(...translateFieldErrors(error.children, path));
    }
  }
  return result;
}

/** The same failures as plain messages (the legacy `message` array). */
export function translateValidationErrors(errors: ValidationError[]): string[] {
  return translateFieldErrors(errors).map((entry) => entry.message);
}
