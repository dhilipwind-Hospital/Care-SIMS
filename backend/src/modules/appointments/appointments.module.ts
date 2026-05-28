import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentReminderService } from './appointment-reminder.service';
@Module({ controllers: [AppointmentsController], providers: [AppointmentsService, AppointmentReminderService], exports: [AppointmentsService] })
export class AppointmentsModule {}
