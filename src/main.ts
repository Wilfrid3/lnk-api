import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add global prefix /api to all routes
  app.setGlobalPrefix('api');

  // Apply global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow additional properties for query arrays
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://yamohub.work.gd'], // or specify domains like ['http://localhost:3000', 'https://yourdomain.com']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Serve uploads directory statically
  app.use(
    '/upload',
    require('express').static(path.join(__dirname, '..', 'upload')),
  );

  // Get app configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Set up Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('LNK API')
    .setDescription('The LNK API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    // Update Swagger server URL to include the /api prefix
    .addServer('/api')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API is available at: http://localhost:${port}/api`);
  console.log(
    `Swagger documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
