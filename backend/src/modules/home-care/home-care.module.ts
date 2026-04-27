import { Module } from '@nestjs/common';
import { HomeCareController } from './home-care.controller';
import { HomeCareService } from './home-care.service';
@Module({ controllers: [HomeCareController], providers: [HomeCareService], exports: [HomeCareService] })
export class HomeCareModule {}
