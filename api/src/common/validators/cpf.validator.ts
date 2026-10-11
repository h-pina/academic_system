import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isValidCpf } from '../utils/cpf.util';

export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return typeof value === 'string' && isValidCpf(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return '$property must be a valid CPF number';
        },
      },
    });
  };
}
