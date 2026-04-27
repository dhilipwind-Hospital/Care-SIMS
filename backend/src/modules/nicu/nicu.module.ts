import { Module } from '@nestjs/common';
import { NicuController } from './nicu.controller';
import { NicuService } from './nicu.service';
@Module({ controllers: [NicuController], providers: [NicuService], exports: [NicuService] })
export class NicuModule {}
