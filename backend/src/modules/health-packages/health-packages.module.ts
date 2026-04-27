import { Module } from '@nestjs/common';
import { HealthPackagesController } from './health-packages.controller';
import { HealthPackagesService } from './health-packages.service';
@Module({ controllers: [HealthPackagesController], providers: [HealthPackagesService], exports: [HealthPackagesService] })
export class HealthPackagesModule {}
