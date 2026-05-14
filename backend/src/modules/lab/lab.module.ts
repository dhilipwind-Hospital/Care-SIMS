import { Module } from '@nestjs/common';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { BillingModule } from '../billing/billing.module';
@Module({ imports: [BillingModule], controllers: [LabController], providers: [LabService], exports: [LabService] })
export class LabModule {}
