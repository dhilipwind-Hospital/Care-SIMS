import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { sendEmail } from '../../common/utils/mailer';

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);
  constructor(private prisma: PrismaService) {}

  // Runs every 15 minutes. Sends 24h reminders for appointments roughly 24h
  // away (window: 23h-25h ahead) that haven't been reminded yet.
  @Cron(CronExpression.EVERY_30_MINUTES)
  async send24hReminders() {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 2);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startDate, lte: endDate },
        status: 'SCHEDULED',
        reminder24hSent: false,
      },
      include: { patient: { select: { firstName: true, lastName: true, email: true } } },
      take: 500,
    });

    let sent = 0;
    for (const appt of appointments) {
      const apptDateTime = this.combineDateTime(appt.appointmentDate, appt.appointmentTime);
      if (!apptDateTime) continue;
      const hoursAway = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursAway < 22 || hoursAway > 26) continue;
      if (!appt.patient?.email) {
        await this.prisma.appointment.update({ where: { id: appt.id }, data: { reminder24hSent: true } }).catch(() => null);
        continue;
      }

      try {
        await this.sendReminder(appt, '24 hours');
        await this.prisma.appointment.update({ where: { id: appt.id }, data: { reminder24hSent: true } });
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send 24h reminder for appointment ${appt.id}`, err as any);
      }
    }
    if (sent > 0) this.logger.log(`Sent ${sent} 24-hour appointment reminder(s)`);
  }

  private combineDateTime(date: Date, time: string): Date | null {
    if (!date || !time) return null;
    const [h, m] = time.split(':').map((x) => Number(x));
    if (isNaN(h) || isNaN(m)) return null;
    const combined = new Date(date);
    combined.setHours(h, m, 0, 0);
    return combined;
  }

  private async sendReminder(appt: any, leadTime: string) {
    const [tenant, doctor] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: appt.tenantId }, select: { tradeName: true, legalName: true } }),
      appt.doctorId ? this.prisma.tenantUser.findFirst({ where: { id: appt.doctorId, tenantId: appt.tenantId }, select: { firstName: true, lastName: true } }) : Promise.resolve(null),
    ]);
    const orgName = tenant?.tradeName || tenant?.legalName || 'your hospital';
    const doctorName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`.trim() : 'your doctor';
    const apptDate = new Date(appt.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${orgName}</h1>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1f2937;margin:0 0 16px;">Appointment reminder</h2>
          <p style="color:#4b5563;line-height:1.6;">
            Dear ${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''},<br/><br/>
            This is a friendly reminder that you have an appointment in approximately ${leadTime}.
          </p>
          <p style="color:#4b5563;font-size:13px;">
            <strong>Doctor:</strong> ${doctorName}<br/>
            <strong>Date:</strong> ${apptDate}<br/>
            <strong>Time:</strong> ${appt.appointmentTime}<br/>
            ${appt.chiefComplaint ? `<strong>Reason:</strong> ${appt.chiefComplaint}<br/>` : ''}
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">
            Please arrive 15 minutes early. If you need to reschedule or cancel, contact our reception desk as soon as possible.
          </p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This is an automated message from ${orgName}. Do not reply.</p>
      </div>`;
    await sendEmail(appt.patient.email, `Appointment reminder - ${apptDate} - ${orgName}`, html);
  }
}
