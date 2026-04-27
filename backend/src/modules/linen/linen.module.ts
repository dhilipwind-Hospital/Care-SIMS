import { Module } from '@nestjs/common';
import { LinenController } from './linen.controller';
import { LinenService } from './linen.service';
@Module({ controllers: [LinenController], providers: [LinenService], exports: [LinenService] })
export class LinenModule {}
