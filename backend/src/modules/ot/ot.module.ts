import { Module } from '@nestjs/common';
import { OTController } from './ot.controller';
import { OTService } from './ot.service';
@Module({ controllers: [OTController], providers: [OTService], exports: [OTService] })
export class OTModule {}
