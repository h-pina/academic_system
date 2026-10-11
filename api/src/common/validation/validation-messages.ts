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
  page: 'página',
  pageSize: 'tamanho da página',
  q: 'busca',
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

/** Flattens class-validator errors into Portuguese messages for the UI. */
export function translateValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const field = FIELD_LABELS[error.property] ?? error.property;

    for (const key of Object.keys(error.constraints ?? {})) {
      if (key === 'whitelistValidation') {
        messages.push(`O campo "${path}" não é permitido`);
        continue;
      }
      const build = CONSTRAINT_MESSAGES[key] ?? ((name: string) => `${name} é inválido`);
      messages.push(capitalize(build(field)));
    }

    if (error.children?.length) {
      messages.push(...translateValidationErrors(error.children, path));
    }
  }
  return messages;
}
