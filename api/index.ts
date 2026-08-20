import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';

// Ensure AppModule is loaded from the compiled dist directory or source
let AppModule: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppModule = require('../apps/api/dist/src/app.module').AppModule;
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppModule = require('../apps/api/src/app.module').AppModule;
}

const server = express();
let isAppInitialized = false;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.init();
  isAppInitialized = true;
}

export default async function handler(req: Request, res: Response) {
  if (!isAppInitialized) {
    await bootstrap();
  }
  server(req, res);
}
