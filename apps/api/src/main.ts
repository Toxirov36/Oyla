import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';
import { config } from './common/config';
import { ApiExceptionFilter } from './common/exception.filter';
import { createValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new ConsoleLogger({ json: true }) });
  app.setGlobalPrefix('api/v1');
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', config.TRUST_PROXY === '1' ? 1 : false);
  app.use(helmet());
  app.use(json({ limit: '256kb' }));
  app.use(cookieParser());
  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  if (config.NODE_ENV !== 'production') {
    const options = new DocumentBuilder()
      .setTitle('OYLA API')
      .setDescription('OYLA learning platform · class-validator request contracts')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, options));
  }
  await app.listen(config.PORT, '0.0.0.0');
}
void bootstrap();
