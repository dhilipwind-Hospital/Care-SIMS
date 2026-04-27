import { Module } from '@nestjs/common';
import { PalliativeCareController } from './palliative-care.controller';
import { PalliativeCareService } from './palliative-care.service';
@Module({ controllers: [PalliativeCareController], providers: [PalliativeCareService], exports: [PalliativeCareService] })
export class PalliativeCareModule {}
