import { Module } from '@nestjs/common';
import { AntimicrobialStewardshipController } from './antimicrobial-stewardship.controller';
import { AntimicrobialStewardshipService } from './antimicrobial-stewardship.service';
@Module({ controllers: [AntimicrobialStewardshipController], providers: [AntimicrobialStewardshipService], exports: [AntimicrobialStewardshipService] })
export class AntimicrobialStewardshipModule {}
