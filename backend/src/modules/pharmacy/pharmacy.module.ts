import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { BillingModule } from '../billing/billing.module';
@Module({ imports: [BillingModule], controllers: [PharmacyController], providers: [PharmacyService], exports: [PharmacyService] })
export class PharmacyModule {}
