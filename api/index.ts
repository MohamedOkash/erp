import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';

const server = express();
let isAppInitialized = false;
let bootstrapError: any = null;

async function bootstrap() {
  if (isAppInitialized) return;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  let AppModule: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppModule = require('../apps/api/dist/src/app.module').AppModule;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppModule = require('../apps/api/src/app.module').AppModule;
  }

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
  try {
    if (bootstrapError) {
      throw bootstrapError;
    }

    if (!isAppInitialized) {
      try {
        await bootstrap();
      } catch (err: any) {
        bootstrapError = err;
        console.error('[Vercel Serverless Bootstrap Error]:', err);
        return res.status(500).json({
          statusCode: 500,
          error: err?.message || 'Serverless Bootstrap Initialization Failed',
          stack: err?.stack ? err.stack.split('\n').slice(0, 5) : [],
        });
      }
    }

    server(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Request Error]:', err);
    return res.status(500).json({
      statusCode: 500,
      error: err?.message || 'Internal Serverless Execution Error',
      stack: err?.stack ? err.stack.split('\n').slice(0, 5) : [],
    });
  }
}
