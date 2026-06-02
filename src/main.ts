import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express'; // Import this!

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // Increase body size limit to handle large news content (e.g. large tables)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '50mb' }));
  const frontendOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', ...frontendOrigins],
          scriptSrc: ["'self'"],
          frameAncestors: ["'self'", ...frontendOrigins],
        },
      },
      // Ensure uploaded images can be embedded by frontend origin
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  // Use process.cwd() to ensure it looks in /app/uploads inside Docker
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    // This 'prefix' means files will be available at https://cesia.cloud/api/uploads/...
    prefix: '/api/uploads/', 
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
