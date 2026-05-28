import { Module } from '@nestjs/common';
import { NotificationsController, EmailHealthController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
@Module({ controllers: [NotificationsController, EmailHealthController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
