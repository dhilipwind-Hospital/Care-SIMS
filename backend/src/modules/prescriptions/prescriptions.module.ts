import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { BillingModule } from '../billing/billing.module';
@Module({ imports: [BillingModule], controllers: [PrescriptionsController], providers: [PrescriptionsService], exports: [PrescriptionsService] })
export class PrescriptionsModule {}
