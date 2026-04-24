import { Module } from '@nestjs/common';
import { CssdController } from './cssd.controller';
import { CssdService } from './cssd.service';
@Module({ controllers: [CssdController], providers: [CssdService], exports: [CssdService] })
export class CssdModule {}
