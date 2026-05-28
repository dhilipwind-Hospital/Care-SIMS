import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { calculateApacheII, calculateSOFA } from '../../common/utils/icu-scoring';
import { sendEmail } from '../../common/utils/mailer';

@Injectable()
export class IcuService {
  private readonly logger = new Logger(IcuService.name);
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async listBeds(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const beds = await this.prisma.icuBed.findMany({ where, orderBy: { bedNumber: 'asc' } });
    // Resolve patient names for occupied beds
    const patientIds = beds.filter(b => b.currentPatientId).map(b => b.currentPatientId as string);
    const patients = patientIds.length > 0
      ? await this.prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, firstName: true, lastName: true, patientId: true } })
      : [];
    const patientMap = new Map(patients.map(p => [p.id, p]));
    return beds.map(b => ({ ...b, currentPatient: b.currentPatientId ? patientMap.get(b.currentPatientId) || null : null }));
  }

  async addBed(tenantId: string, dto: any) {
    return this.prisma.icuBed.create({
      data: {
        tenantId, locationId: dto.locationId, wardId: dto.wardId, bedNumber: dto.bedNumber,
        icuType: dto.icuType, hasVentilator: dto.hasVentilator || false,
        hasMonitor: dto.hasMonitor ?? true, hasDialysis: dto.hasDialysis || false,
      },
    });
  }

  async updateBedStatus(tenantId: string, id: string, status: string) {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.icuBed.findFirst({ where: { id, tenantId } });
      if (!bed) throw new NotFoundException('ICU bed not found');
      return tx.icuBed.update({ where: { id, tenantId }, data: { status } });
    });
  }

  async admitToBed(tenantId: string, bedId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.icuBed.findFirst({ where: { id: bedId, tenantId } });
      if (!bed) throw new NotFoundException('ICU bed not found');
      if (bed.status === 'OCCUPIED') throw new BadRequestException('Bed is already occupied');
      return tx.icuBed.update({
        where: { id: bedId, tenantId },
        data: { status: 'OCCUPIED', currentPatientId: dto.patientId, admittedAt: new Date() },
      });
    });
  }

  async transferOut(tenantId: string, bedId: string, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.icuBed.findFirst({ where: { id: bedId, tenantId } });
      if (!bed) throw new NotFoundException('ICU bed not found');
      if (bed.status !== 'OCCUPIED') throw new BadRequestException('Bed is not occupied');

      // Record a final monitoring note for transfer
      if (bed.currentPatientId) {
        await tx.icuMonitoring.create({
          data: {
            tenantId, locationId: bed.locationId, patientId: bed.currentPatientId,
            icuBedId: bedId, admissionId: dto.admissionId || null,
            nursesNotes: `Transferred out of ICU. Destination: ${dto.destination || 'Ward'}. Reason: ${dto.reason || 'Stable for transfer'}`,
            recordedById: userId,
          },
        });
      }

      return tx.icuBed.update({
        where: { id: bedId, tenantId },
        data: { status: 'AVAILABLE', currentPatientId: null, admittedAt: null },
      });
    });
  }

  async recordMonitoring(tenantId: string, userId: string, dto: any) {
    // Auto-calculate clinical scores
    const apacheIIScore = calculateApacheII(dto);
    const sofaScore = calculateSOFA(dto);

    const record = await this.prisma.icuMonitoring.create({
      data: {
        tenantId, locationId: dto.locationId, admissionId: dto.admissionId,
        patientId: dto.patientId, icuBedId: dto.icuBedId,
        systolicBp: dto.systolicBp, diastolicBp: dto.diastolicBp,
        heartRate: dto.heartRate, respiratoryRate: dto.respiratoryRate,
        spo2: dto.spo2, temperatureC: dto.temperatureC, gcs: dto.gcs,
        ventilatorMode: dto.ventilatorMode, fio2: dto.fio2, peep: dto.peep,
        tidalVolume: dto.tidalVolume, centralVenousPressure: dto.cvp,
        urineOutputMl: dto.urineOutputMl, intakeOutputBalance: dto.ioBalance,
        bloodSugarMg: dto.bloodSugarMg, infusions: dto.infusions,
        sedationScore: dto.sedationScore, painScore: dto.painScore,
        nursesNotes: dto.nursesNotes, recordedById: userId,
        // Lab values for scoring
        arterialPh: dto.arterialPh, pao2: dto.pao2,
        serumSodium: dto.serumSodium, serumPotassium: dto.serumPotassium,
        serumCreatinine: dto.serumCreatinine, hematocrit: dto.hematocrit,
        wbc: dto.wbc, plateletCount: dto.plateletCount,
        bilirubinMg: dto.bilirubinMg, lactate: dto.lactate,
        // Computed scores
        apacheIIScore, sofaScore,
      },
    });

    // Critical value alerts
    const alerts: string[] = [];
    if (dto.spo2 && Number(dto.spo2) < 90) alerts.push(`SpO2 critically low: ${dto.spo2}%`);
    if (dto.heartRate && (dto.heartRate > 150 || dto.heartRate < 40)) alerts.push(`Heart rate critical: ${dto.heartRate} bpm`);
    if (dto.systolicBp && (dto.systolicBp > 180 || dto.systolicBp < 80)) alerts.push(`Blood pressure critical: ${dto.systolicBp}/${dto.diastolicBp || '?'} mmHg`);
    if (dto.temperatureC && (Number(dto.temperatureC) > 39.5 || Number(dto.temperatureC) < 35)) alerts.push(`Temperature critical: ${dto.temperatureC}°C`);
    if (dto.respiratoryRate && (dto.respiratoryRate > 30 || dto.respiratoryRate < 8)) alerts.push(`Respiratory rate critical: ${dto.respiratoryRate}/min`);
    if (dto.gcs && dto.gcs < 8) alerts.push(`GCS critically low: ${dto.gcs}`);

    if (alerts.length > 0) {
      this.ws.emitToTenant(tenantId, 'icu:critical-alert', {
        bedId: dto.icuBedId,
        patientId: dto.patientId,
        alerts,
        recordedAt: record.recordedAt,
      });
      this.emailCriticalAlert(tenantId, dto, alerts).catch((err) =>
        this.logger.error('Failed to email ICU critical alert', err as any),
      );
    }

    return { ...record, criticalAlerts: alerts.length > 0 ? alerts : undefined };
  }

  private async emailCriticalAlert(tenantId: string, dto: any, alerts: string[]) {
    const [patient, admission, tenant] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId }, select: { firstName: true, lastName: true, patientId: true } }),
      dto.admissionId ? this.prisma.admission.findFirst({ where: { id: dto.admissionId, tenantId }, select: { admittingDoctorId: true } }) : Promise.resolve(null),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } }),
    ]);
    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';

    const recipients = new Set<string>();
    const attendingDoctorId = (admission as any)?.admittingDoctorId;
    if (attendingDoctorId) {
      const doc = await this.prisma.tenantUser.findFirst({ where: { id: attendingDoctorId, tenantId }, select: { email: true } });
      if (doc?.email) recipients.add(doc.email);
    }
    // Also notify a small backup pool of active doctors/nurses
    const icuDoctors = await this.prisma.tenantUser.findMany({
      where: { tenantId, isActive: true, role: { systemRoleId: { in: ['SYS_DOCTOR', 'SYS_NURSE'] } } },
      select: { email: true },
      take: 5,
    }).catch(() => [] as any[]);
    icuDoctors.filter((u: any) => u.email).slice(0, 3).forEach((u: any) => recipients.add(u.email));

    if (recipients.size === 0) return;

    const patientLabel = patient ? `${patient.firstName || ''} ${patient.lastName || ''} (${patient.patientId})`.trim() : `Patient ${dto.patientId}`;
    const alertsHtml = alerts.map((a) => `<li style="margin:4px 0;color:#991b1b;">${a}</li>`).join('');
    const recordedAt = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#991b1b;padding:20px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">⚠ ICU CRITICAL ALERT</h1>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #fecaca;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#4b5563;line-height:1.6;">
            Critical vitals were just recorded for <strong>${patientLabel}</strong> at ${orgName}.
          </p>
          <h3 style="color:#991b1b;font-size:15px;margin:20px 0 0;">Critical findings</h3>
          <ul style="margin:8px 0 0;padding-left:20px;">${alertsHtml}</ul>
          <p style="color:#4b5563;font-size:13px;margin-top:16px;"><strong>Recorded:</strong> ${recordedAt}</p>
          <p style="color:#991b1b;font-weight:600;margin-top:16px;">Immediate clinical review is required.</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This is an automated alert from ${orgName} ICU monitoring.</p>
      </div>`;

    const subject = `⚠ ICU CRITICAL ALERT - ${patientLabel} - ${orgName}`;
    for (const email of recipients) {
      sendEmail(email, subject, html).catch((err) => this.logger.error(`Failed to send ICU alert to ${email}`, err));
    }
  }

  async getAdmissionMonitoring(tenantId: string, admissionId: string) {
    return this.prisma.icuMonitoring.findMany({ where: { tenantId, admissionId }, orderBy: { recordedAt: 'desc' } });
  }

  // ── Doctor Rounds ──

  async createRound(tenantId: string, userId: string, dto: any) {
    return this.prisma.icuRound.create({
      data: {
        tenantId, admissionId: dto.admissionId, patientId: dto.patientId,
        icuBedId: dto.icuBedId, roundType: dto.roundType || 'MORNING',
        currentStatus: dto.currentStatus, assessment: dto.assessment,
        plan: dto.plan, ventilatorPlan: dto.ventilatorPlan,
        nutritionPlan: dto.nutritionPlan, labsOrdered: dto.labsOrdered,
        consultRequested: dto.consultRequested, estimatedLos: dto.estimatedLos,
        roundedById: userId,
      },
    });
  }

  async getRounds(tenantId: string, admissionId: string) {
    return this.prisma.icuRound.findMany({
      where: { tenantId, admissionId },
      orderBy: { roundedAt: 'desc' },
    });
  }

  // ── Code Blue ──

  async triggerCodeBlue(tenantId: string, bedId: string, userId: string, dto: any) {
    const bed = await this.prisma.icuBed.findFirst({ where: { id: bedId, tenantId } });
    if (!bed) throw new NotFoundException('ICU bed not found');

    // Record an emergency monitoring note
    if (bed.currentPatientId) {
      await this.prisma.icuMonitoring.create({
        data: {
          tenantId, locationId: bed.locationId, patientId: bed.currentPatientId,
          icuBedId: bedId, admissionId: dto.admissionId || null,
          nursesNotes: `🔴 CODE BLUE ACTIVATED — ${dto.reason || 'Cardiac/Respiratory arrest'}. Response team called.`,
          recordedById: userId,
        },
      });
    }

    // Emit real-time alert
    this.ws.emitToTenant(tenantId, 'icu:code-blue', {
      bedId, bedNumber: bed.bedNumber, locationId: bed.locationId,
      patientId: bed.currentPatientId, reason: dto.reason || 'Cardiac/Respiratory arrest',
      triggeredAt: new Date(), triggeredById: userId,
    });

    return { message: `Code Blue activated for ICU Bed ${bed.bedNumber}`, bedId };
  }

  async dashboard(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const beds = await this.prisma.icuBed.findMany({ where });
    const occupied = beds.filter(b => b.status === 'OCCUPIED');
    return {
      total: beds.length,
      available: beds.filter(b => b.status === 'AVAILABLE').length,
      occupied: occupied.length,
      maintenance: beds.filter(b => b.status === 'UNDER_MAINTENANCE').length,
      ventilatorInUse: occupied.filter(b => b.hasVentilator).length,
      monitorInUse: occupied.filter(b => b.hasMonitor).length,
      dialysisInUse: occupied.filter(b => b.hasDialysis).length,
    };
  }
}
