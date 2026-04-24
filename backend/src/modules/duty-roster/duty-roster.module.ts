import { Module } from '@nestjs/common';
import { DutyRosterController } from './duty-roster.controller';
import { DutyRosterService } from './duty-roster.service';
@Module({ controllers: [DutyRosterController], providers: [DutyRosterService], exports: [DutyRosterService] })
export class DutyRosterModule {}
