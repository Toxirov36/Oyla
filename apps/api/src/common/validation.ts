import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function flatten(
  errors: ValidationError[],
  prefix = '',
): { field: string; messages: string[]; codes: string[] }[] {
  return errors.flatMap((error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    return [
      ...(error.constraints
        ? [
            {
              field,
              messages: Object.values(error.constraints),
              codes: Object.keys(error.constraints),
            },
          ]
        : []),
      ...flatten(error.children || [], field),
    ];
  });
}
export function createValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Kiritilgan ma’lumotlarni tekshiring.',
        errors: flatten(errors),
      }),
  });
}
