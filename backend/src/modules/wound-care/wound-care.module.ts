import { Module } from '@nestjs/common';
import { WoundCareController } from './wound-care.controller';
import { WoundCareService } from './wound-care.service';
@Module({ controllers: [WoundCareController], providers: [WoundCareService], exports: [WoundCareService] })
export class WoundCareModule {}
