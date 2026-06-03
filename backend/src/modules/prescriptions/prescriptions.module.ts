import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionAgingService } from './prescription-aging.service';
import { BillingModule } from '../billing/billing.module';
@Module({ imports: [BillingModule], controllers: [PrescriptionsController], providers: [PrescriptionsService, PrescriptionAgingService], exports: [PrescriptionsService] })
export class PrescriptionsModule {}
