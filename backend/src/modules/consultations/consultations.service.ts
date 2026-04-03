import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { doctorId, patientId, locationId, date, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (date) { const d = new Date(date); const next = new Date(d); next.setDate(d.getDate() + 1); where.startedAt = { gte: d, lt: next }; }
    const [data, total] = await Promise.all([
      this.prisma.consultation.findMany({ where, skip, take: Number(limit), orderBy: { startedAt: 'desc' }, include: { patient: { select: { patientId: true, firstName: true, lastName: true } }, diagnoses: true } }),
      this.prisma.consultation.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async start(tenantId: string, dto: any) {
    // Auto-resolve locationId from patient's location or first active location
    let locationId = dto.locationId;
    if (!locationId) {
      const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId }, select: { locationId: true } });
      locationId = patient?.locationId;
    }
    if (!locationId) {
      const loc = await this.prisma.tenantLocation.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
      locationId = loc?.id;
    }
    return this.prisma.consultation.create({
      data: { tenantId, locationId, patientId: dto.patientId, doctorId: dto.doctorId, queueTokenId: dto.queueTokenId, appointmentId: dto.appointmentId, chiefComplaint: dto.chiefComplaint, status: 'DRAFT', isCrossLocation: dto.isCrossLocation || false, accessReason: dto.accessReason },
      include: { patient: true, diagnoses: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.consultation.findFirst({ where: { id, tenantId }, include: { patient: true, diagnoses: true, prescriptions: { include: { items: true } } } });
    if (!c) throw new NotFoundException('Consultation not found');
    return c;
  }

  async update(tenantId: string, id: string, dto: any) {
    const { diagnoses } = dto;
    const data: any = {};
    if (dto.chiefComplaint !== undefined) data.chiefComplaint = dto.chiefComplaint;
    if (dto.assessment !== undefined) data.assessment = dto.assessment;
    if (dto.plan !== undefined) data.plan = dto.plan;
    if (dto.historySubjective !== undefined) data.historySubjective = dto.historySubjective;
    if (dto.historyObjective !== undefined) data.historyObjective = dto.historyObjective;
    if (dto.examinationFindings !== undefined) data.examinationFindings = dto.examinationFindings;
    if (dto.status !== undefined) data.status = dto.status;
    await this.prisma.$transaction(async (tx) => {
      const c = await tx.consultation.findFirst({ where: { id, tenantId } });
      if (!c) throw new NotFoundException('Consultation not found');
      await tx.consultation.update({ where: { id }, data });
      if (diagnoses) {
        await tx.consultationDiagnosis.deleteMany({ where: { consultationId: id } });
        if (diagnoses.length) await tx.consultationDiagnosis.createMany({ data: diagnoses.map((d: any, i: number) => ({ consultationId: id, icdCode: d.icdCode, description: d.description, type: d.type || 'PRIMARY', sortOrder: i })) });
      }
    });
    return this.findOne(tenantId, id);
  }

  async complete(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.consultation.findFirst({ where: { id, tenantId } });
      if (!c) throw new NotFoundException('Consultation not found');
      if (dto.diagnoses) {
        await tx.consultationDiagnosis.deleteMany({ where: { consultationId: id } });
        if (dto.diagnoses.length) await tx.consultationDiagnosis.createMany({ data: dto.diagnoses.map((d: any, i: number) => ({ consultationId: id, icdCode: d.icdCode, description: d.description, type: d.type || 'PRIMARY', sortOrder: i })) });
      }
      return tx.consultation.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), assessment: dto.assessment, plan: dto.plan, historySubjective: dto.historySubjective, historyObjective: dto.historyObjective, examinationFindings: dto.examinationFindings } });
    });
  }
}
