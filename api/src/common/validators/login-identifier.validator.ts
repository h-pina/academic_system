import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { resolveLoginIdentifier } from '../utils/identifier.util';

/** A valid CPF (11 digits) or a registration number (10 digits). */
export function IsLoginIdentifier(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLoginIdentifier',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return resolveLoginIdentifier(value) !== null;
        },
        defaultMessage(_args: ValidationArguments) {
          return '$property must be a valid CPF or a registration number';
        },
      },
    });
  };
}
