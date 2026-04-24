import { Module } from '@nestjs/common';
import { BirthDeathController } from './birth-death.controller';
import { BirthDeathService } from './birth-death.service';
@Module({ controllers: [BirthDeathController], providers: [BirthDeathService], exports: [BirthDeathService] })
export class BirthDeathModule {}
