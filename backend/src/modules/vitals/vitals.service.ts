import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string, orgName?: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">${orgName || 'Ayphen HMS'}</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from ${orgName || 'Ayphen HMS'}. Do not reply.
  </p>
</div>`;
}

@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);
  constructor(private prisma: PrismaService) {}

  async record(tenantId: string, dto: any, recordedById: string) {
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: recordedById }, select: { primaryLocationId: true } });
      locationId = user?.primaryLocationId;
    }
    const vital = await this.prisma.vital.create({
      data: {
        tenantId, locationId, patientId: dto.patientId,
        consultationId: dto.consultationId, admissionId: dto.admissionId,
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp, diastolicBp: dto.diastolicBp,
        heartRate: dto.heartRate, respiratoryRate: dto.respiratoryRate,
        spo2: dto.spo2, weightKg: dto.weightKg,
        heightCm: dto.heightCm, bloodGlucoseMg: dto.bloodGlucoseMg,
        gcs: dto.gcs, painScore: dto.painScore, notes: dto.notes,
        hasAbnormal: dto.hasAbnormal || false, abnormalFields: dto.abnormalFields || [],
        recordedById,
      },
    });

    if (vital.hasAbnormal) {
      this.sendAbnormalVitalsAlert(tenantId, vital, dto).catch((err) => {
        this.logger.error(`Abnormal vitals email dispatch failed: ${err?.message || err}`);
      });
    }

    return vital;
  }

  private async sendAbnormalVitalsAlert(tenantId: string, vital: any, dto: any): Promise<void> {
    let doctorId: string | null = null;
    if (vital.consultationId) {
      const c = await this.prisma.consultation.findUnique({
        where: { id: vital.consultationId },
        select: { doctorId: true },
      });
      doctorId = c?.doctorId || null;
    } else if (vital.admissionId) {
      const a = await this.prisma.admission.findUnique({
        where: { id: vital.admissionId },
        select: { admittingDoctorId: true },
      });
      doctorId = a?.admittingDoctorId || null;
    }

    const [patient, doctor, tenant] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: vital.patientId },
        select: { firstName: true, lastName: true, patientId: true },
      }),
      doctorId
        ? this.prisma.doctorRegistry.findUnique({
            where: { id: doctorId },
            select: { firstName: true, lastName: true, email: true, pgSpecialization: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tradeName: true, legalName: true },
      }),
    ]);

    if (!doctor?.email) return;

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const patientName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || '(unnamed)';
    const mrn = patient?.patientId || '—';

    const rows: string[] = [];
    const flag = (name: string) => (vital.abnormalFields || []).includes(name) ? ' style="color:#dc2626;font-weight:600;"' : '';
    if (vital.systolicBp || vital.diastolicBp) rows.push(`<li${flag('bp')}><strong>BP:</strong> ${vital.systolicBp || '?'}/${vital.diastolicBp || '?'} mmHg</li>`);
    if (vital.heartRate)       rows.push(`<li${flag('heartRate')}><strong>HR:</strong> ${vital.heartRate} bpm</li>`);
    if (vital.temperatureC)    rows.push(`<li${flag('temperatureC')}><strong>Temp:</strong> ${vital.temperatureC} °C</li>`);
    if (vital.spo2)            rows.push(`<li${flag('spo2')}><strong>SpO₂:</strong> ${vital.spo2}%</li>`);
    if (vital.respiratoryRate) rows.push(`<li${flag('respiratoryRate')}><strong>RR:</strong> ${vital.respiratoryRate}/min</li>`);
    if (vital.bloodGlucoseMg)  rows.push(`<li${flag('bloodGlucoseMg')}><strong>Glucose:</strong> ${vital.bloodGlucoseMg} mg/dL</li>`);
    if (vital.gcs !== null && vital.gcs !== undefined) rows.push(`<li${flag('gcs')}><strong>GCS:</strong> ${vital.gcs}/15</li>`);
    if (vital.painScore !== null && vital.painScore !== undefined) rows.push(`<li${flag('painScore')}><strong>Pain:</strong> ${vital.painScore}/10</li>`);

    const abnormalList = (vital.abnormalFields || []).join(', ') || 'flagged by nurse';
    const subject = `⚠️ Abnormal vitals — ${patientName} — ${orgName}`;
    const body = `Dr ${doctor.firstName || ''} ${doctor.lastName || ''},<br/><br/>
Abnormal vitals were just recorded for your patient and require review.<br/><br/>
<strong>Patient:</strong> ${patientName} (MRN ${mrn})<br/>
<strong>Abnormal fields:</strong> <span style="color:#dc2626;">${abnormalList}</span><br/>
${rows.length ? `<p><strong>Current readings:</strong></p><ul style="line-height:1.7;">${rows.join('')}</ul>` : ''}
${dto.notes ? `<p><strong>Nurse note:</strong> ${dto.notes}</p>` : ''}
<br/>Please assess the patient at the earliest.`;
    sendEmail(doctor.email, subject, emailTemplate('Abnormal Vitals Alert', body, orgName))
      .catch((err) => this.logger.error(`Abnormal vitals doctor email failed: ${err?.message || err}`));
  }

  async getForPatient(tenantId: string, patientId: string, limit = 20) {
    return this.prisma.vital.findMany({ where: { tenantId, patientId }, orderBy: { recordedAt: 'desc' }, take: Number(limit) });
  }

  async getForConsultation(tenantId: string, consultationId: string) {
    return this.prisma.vital.findMany({ where: { tenantId, consultationId }, orderBy: { recordedAt: 'asc' } });
  }

  async getForAdmission(tenantId: string, admissionId: string) {
    return this.prisma.vital.findMany({ where: { tenantId, admissionId }, orderBy: { recordedAt: 'asc' } });
  }
}
