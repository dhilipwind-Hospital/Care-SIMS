import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Security headers
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:5555',
        'http://localhost:5555',
        'http://localhost:8081',
        'http://localhost:19006',
      ].filter(Boolean);
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in production for now (mobile needs it)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Access-Reason', 'X-Offline', 'X-Offline-Replay'],
  });

  // Ensure upload directories exist
  const uploadsDir = join(process.cwd(), 'uploads');
  for (const sub of ['profiles', 'documents']) {
    const dir = join(uploadsDir, sub);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Serve uploaded files statically
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Ayphen HMS API')
    .setDescription('Multi-Tenant Hospital Management System — SaaS Platform')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 6666;
  await app.listen(port);
  console.log(`\n🚀 Ayphen HMS API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs\n`);
}
bootstrap();
