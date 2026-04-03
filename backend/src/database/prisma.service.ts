import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error.message);
      this.logger.error('DATABASE_URL host: ' + (process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'));
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
