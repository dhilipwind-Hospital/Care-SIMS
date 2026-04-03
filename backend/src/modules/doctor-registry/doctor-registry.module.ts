import { Module } from '@nestjs/common';
import { DoctorRegistryController } from './doctor-registry.controller';
import { DoctorRegistryService } from './doctor-registry.service';
@Module({ controllers: [DoctorRegistryController], providers: [DoctorRegistryService], exports: [DoctorRegistryService] })
export class DoctorRegistryModule {}
