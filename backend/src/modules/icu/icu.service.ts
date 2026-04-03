import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
@Injectable()
export class IcuService {
  constructor(private prisma: PrismaService) {}
  async listBeds(tenantId: string, locationId?: string) { const where: any = { tenantId }; if (locationId) where.locationId = locationId; return this.prisma.icuBed.findMany({ where, orderBy: { bedNumber: 'asc' } }); }
  async addBed(tenantId: string, dto: any) { return this.prisma.icuBed.create({ data: { tenantId, locationId: dto.locationId, wardId: dto.wardId, bedNumber: dto.bedNumber, icuType: dto.icuType, hasVentilator: dto.hasVentilator||false, hasMonitor: dto.hasMonitor??true, hasDialysis: dto.hasDialysis||false } }); }
  async updateBedStatus(tenantId: string, id: string, status: string) { return this.prisma.$transaction(async (tx) => { const bed = await tx.icuBed.findFirst({ where: { id, tenantId } }); if (!bed) throw new NotFoundException('ICU bed not found'); return tx.icuBed.update({ where: { id }, data: { status } }); }); }
  async recordMonitoring(tenantId: string, userId: string, dto: any) { return this.prisma.icuMonitoring.create({ data: { tenantId, locationId: dto.locationId, admissionId: dto.admissionId, patientId: dto.patientId, icuBedId: dto.icuBedId, systolicBp: dto.systolicBp, diastolicBp: dto.diastolicBp, heartRate: dto.heartRate, respiratoryRate: dto.respiratoryRate, spo2: dto.spo2, temperatureC: dto.temperatureC, gcs: dto.gcs, ventilatorMode: dto.ventilatorMode, fio2: dto.fio2, peep: dto.peep, tidalVolume: dto.tidalVolume, centralVenousPressure: dto.cvp, urineOutputMl: dto.urineOutputMl, intakeOutputBalance: dto.ioBalance, bloodSugarMg: dto.bloodSugarMg, infusions: dto.infusions, sedationScore: dto.sedationScore, painScore: dto.painScore, nursesNotes: dto.nursesNotes, recordedById: userId } }); }
  async getAdmissionMonitoring(tenantId: string, admissionId: string) { return this.prisma.icuMonitoring.findMany({ where: { tenantId, admissionId }, orderBy: { recordedAt: 'desc' } }); }
  async dashboard(tenantId: string, locationId?: string) {
    const where: any = { tenantId }; if (locationId) where.locationId = locationId;
    const beds = await this.prisma.icuBed.findMany({ where });
    return { total: beds.length, available: beds.filter(b=>b.status==='AVAILABLE').length, occupied: beds.filter(b=>b.status==='OCCUPIED').length, ventilatorInUse: beds.filter(b=>b.status==='OCCUPIED'&&b.hasVentilator).length };
  }
}
