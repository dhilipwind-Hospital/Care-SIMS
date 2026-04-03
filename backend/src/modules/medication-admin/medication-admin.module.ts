import { Module } from '@nestjs/common';
import { MedicationAdminController } from './medication-admin.controller';
import { MedicationAdminService } from './medication-admin.service';
@Module({ controllers: [MedicationAdminController], providers: [MedicationAdminService], exports: [MedicationAdminService] })
export class MedicationAdminModule {}
