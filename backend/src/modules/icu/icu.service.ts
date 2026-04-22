import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';

@Injectable()
export class IcuService {
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
      return tx.icuBed.update({ where: { id }, data: { status } });
    });
  }

  async admitToBed(tenantId: string, bedId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.icuBed.findFirst({ where: { id: bedId, tenantId } });
      if (!bed) throw new NotFoundException('ICU bed not found');
      if (bed.status === 'OCCUPIED') throw new BadRequestException('Bed is already occupied');
      return tx.icuBed.update({
        where: { id: bedId },
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
        where: { id: bedId },
        data: { status: 'AVAILABLE', currentPatientId: null, admittedAt: null },
      });
    });
  }

  async recordMonitoring(tenantId: string, userId: string, dto: any) {
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
    }

    return { ...record, criticalAlerts: alerts.length > 0 ? alerts : undefined };
  }

  async getAdmissionMonitoring(tenantId: string, admissionId: string) {
    return this.prisma.icuMonitoring.findMany({ where: { tenantId, admissionId }, orderBy: { recordedAt: 'desc' } });
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
