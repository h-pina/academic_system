import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Stable message codes from the specification's message list (MSG01-MSG04),
 * so the UI can render and test them independently of the wording.
 */
export const MESSAGES = {
  MSG01: 'Pré-requisito não atendido para a disciplina selecionada.',
  MSG02: 'Não há vagas disponíveis na turma.',
  MSG03: 'Existe conflito de horário com outra turma.',
  MSG04: 'Operação realizada com sucesso.',
} as const;
export type MessageCode = keyof typeof MESSAGES;

function body(
  status: number,
  error: string,
  code: string,
  message: string,
): Record<string, unknown> {
  return { statusCode: status, message, error, code };
}

export const prerequisiteNotMet = (detail?: string) =>
  new BadRequestException(
    body(400, 'Bad Request', 'MSG01', detail ? `${MESSAGES.MSG01} ${detail}` : MESSAGES.MSG01),
  );

export const noSeatsAvailable = () =>
  new ConflictException(body(409, 'Conflict', 'MSG02', MESSAGES.MSG02));

export const scheduleConflict = (detail?: string) =>
  new ConflictException(
    body(409, 'Conflict', 'MSG03', detail ? `${MESSAGES.MSG03} ${detail}` : MESSAGES.MSG03),
  );

/** A rule violation with a machine-readable code beyond the MSG list. */
export const ruleViolation = (code: string, message: string) =>
  new BadRequestException(body(400, 'Bad Request', code, message));

export const forbiddenWithCode = (code: string, message: string) =>
  new ForbiddenException(body(403, 'Forbidden', code, message));
