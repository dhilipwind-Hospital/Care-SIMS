import { Module } from '@nestjs/common';
import { BloodBankController } from './blood-bank.controller';
import { BloodBankService } from './blood-bank.service';
@Module({ controllers: [BloodBankController], providers: [BloodBankService], exports: [BloodBankService] })
export class BloodBankModule {}
