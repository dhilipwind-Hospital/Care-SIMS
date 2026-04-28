import { Module } from '@nestjs/common';
import { MrdController } from './mrd.controller';
import { MrdService } from './mrd.service';
@Module({ controllers: [MrdController], providers: [MrdService], exports: [MrdService] })
export class MrdModule {}
