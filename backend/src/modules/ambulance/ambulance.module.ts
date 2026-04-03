import { Module } from '@nestjs/common';
import { AmbulanceController } from './ambulance.controller';
import { AmbulanceService } from './ambulance.service';
@Module({ controllers: [AmbulanceController], providers: [AmbulanceService], exports: [AmbulanceService] })
export class AmbulanceModule {}
