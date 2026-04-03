import { Module } from '@nestjs/common';
import { DialysisController } from './dialysis.controller';
import { DialysisService } from './dialysis.service';
@Module({ controllers: [DialysisController], providers: [DialysisService], exports: [DialysisService] })
export class DialysisModule {}
