import { Module } from '@nestjs/common';
import { CentralStoreController } from './central-store.controller';
import { CentralStoreService } from './central-store.service';
@Module({ controllers: [CentralStoreController], providers: [CentralStoreService], exports: [CentralStoreService] })
export class CentralStoreModule {}
