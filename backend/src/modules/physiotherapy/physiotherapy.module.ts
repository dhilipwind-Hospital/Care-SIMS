import { Module } from '@nestjs/common';
import { PhysiotherapyController } from './physiotherapy.controller';
import { PhysiotherapyService } from './physiotherapy.service';
@Module({ controllers: [PhysiotherapyController], providers: [PhysiotherapyService], exports: [PhysiotherapyService] })
export class PhysiotherapyModule {}
