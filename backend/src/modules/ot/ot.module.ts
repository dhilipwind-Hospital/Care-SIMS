import { Module } from '@nestjs/common';
import { OTController } from './ot.controller';
import { OTService } from './ot.service';
import { BillingModule } from '../billing/billing.module';
@Module({ imports: [BillingModule], controllers: [OTController], providers: [OTService], exports: [OTService] })
export class OTModule {}
