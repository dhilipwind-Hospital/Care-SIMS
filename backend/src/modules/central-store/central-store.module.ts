import { Module } from '@nestjs/common';
import { CentralStoreController } from './central-store.controller';
import { CentralStoreService } from './central-store.service';
import { CentralStoreAlertService } from './central-store-alert.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [NotificationsModule],
  controllers: [CentralStoreController],
  providers: [CentralStoreService, CentralStoreAlertService],
  exports: [CentralStoreService],
})
export class CentralStoreModule {}
