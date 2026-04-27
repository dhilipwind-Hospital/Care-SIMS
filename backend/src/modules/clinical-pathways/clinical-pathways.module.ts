import { Module } from '@nestjs/common';
import { ClinicalPathwaysController } from './clinical-pathways.controller';
import { ClinicalPathwaysService } from './clinical-pathways.service';
@Module({ controllers: [ClinicalPathwaysController], providers: [ClinicalPathwaysService], exports: [ClinicalPathwaysService] })
export class ClinicalPathwaysModule {}
