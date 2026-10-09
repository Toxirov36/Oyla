import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Response, Request } from 'express';
import { localizedMessage, localizedValidation, resolveLocale } from './locale';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    let status = error instanceof HttpException ? error.getStatus() : 500;
    let body: object = { message: 'Kutilmagan xatolik yuz berdi.' };
    if (error instanceof HttpException) {
      const result = error.getResponse();
      body = typeof result === 'string' ? { message: result } : result;
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      status = error.code === 'P2025' ? 404 : ['P2002', 'P2003'].includes(error.code) ? 409 : 500;
      body = {
        message:
          status === 404
            ? 'Ma’lumot topilmadi.'
            : status === 409
              ? 'Ma’lumot mavjud yoki boshqa yozuvlar bilan bog‘langan.'
              : 'Ma’lumotlarni saqlashda xatolik.',
      };
    }
    if (status >= 500)
      this.logger.error(
        JSON.stringify({
          event: 'request_failed',
          method: request.method,
          path: request.path,
          status,
          errorType: error instanceof Error ? error.name : 'Unknown',
        }),
      );
    if (status === 401 || status === 429)
      this.logger.warn({
        event: status === 401 ? 'authentication_rejected' : 'rate_limit_rejected',
        method: request.method,
        path: request.path,
        status,
      });
    const locale = resolveLocale(request.headers['accept-language']);
    const localized = { ...body } as Record<string, unknown>;
    if (typeof localized.code === 'string')
      localized.message = localizedMessage(localized.code, locale) ?? localized.message;
    if (locale !== 'uz' && Array.isArray(localized.errors)) {
      localized.errors = localized.errors.map(
        (error: { field: string; messages: string[]; codes?: string[] }) => ({
          ...error,
          messages: error.codes?.map((code) => localizedValidation(code, locale)) ?? error.messages,
        }),
      );
    }
    response.status(status).json({ statusCode: status, ...localized });
  }
}
