import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  async admit(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'Admission',
      idColumn: 'admissionNumber',
      prefix: `ADM-${new Date().getFullYear()}-`,
      tenantId,
      callback: async (tx, admissionNumber) => {
        if (dto.bedId) {
          const bed = await tx.bed.findFirst({ where: { id: dto.bedId, tenantId, status: 'AVAILABLE' } });
          if (!bed) throw new BadRequestException('Bed is not available');
          await tx.bed.update({ where: { id: dto.bedId }, data: { status: 'OCCUPIED' } });
        }
        return tx.admission.create({
          data: {
            tenantId, admissionNumber, locationId: dto.locationId, patientId: dto.patientId,
            bedId: dto.bedId, wardId: dto.wardId, admittingDoctorId: dto.admittingDoctorId,
            departmentId: dto.departmentId, admissionType: dto.admissionType || 'PLANNED',
            diagnosisOnAdmission: dto.diagnosisOnAdmission,
            expectedDischargeDate: dto.expectedDischargeDate ? new Date(dto.expectedDischargeDate) : null,
            status: 'ACTIVE',
          },
          include: { patient: { select: { patientId: true, firstName: true, lastName: true } }, ward: true },
        });
      },
    });
  }

  async getAdmissions(tenantId: string, query: any) {
    const { wardId, locationId, status, doctorId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (wardId) where.wardId = wardId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (doctorId) where.admittingDoctorId = doctorId;
    const [data, total] = await Promise.all([
      this.prisma.admission.findMany({ where, skip, take: Number(limit), orderBy: { admissionDate: 'desc' }, include: { patient: { select: { patientId: true, firstName: true, lastName: true, gender: true } }, ward: { select: { name: true } } } }),
      this.prisma.admission.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getAdmission(tenantId: string, id: string) {
    const a = await this.prisma.admission.findFirst({ where: { id, tenantId }, include: { patient: true, ward: true } });
    if (!a) throw new NotFoundException('Admission not found');
    return a;
  }

  async updateAdmission(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const a = await tx.admission.findFirst({ where: { id, tenantId }, include: { patient: true, ward: true } });
      if (!a) throw new NotFoundException('Admission not found');
      const data: any = {};
      if (dto.bedId !== undefined) data.bedId = dto.bedId;
      if (dto.wardId !== undefined) data.wardId = dto.wardId;
      if (dto.admittingDoctorId !== undefined) data.admittingDoctorId = dto.admittingDoctorId;
      if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
      if (dto.diagnosisOnAdmission !== undefined) data.diagnosisOnAdmission = dto.diagnosisOnAdmission;
      if (dto.expectedDischargeDate !== undefined) data.expectedDischargeDate = dto.expectedDischargeDate ? new Date(dto.expectedDischargeDate) : null;
      if (dto.admissionType !== undefined) data.admissionType = dto.admissionType;
      if (dto.status !== undefined) data.status = dto.status;
      return tx.admission.update({ where: { id }, data });
    });
  }

  async transferBed(tenantId: string, id: string, newBedId: string) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findFirst({ where: { id, tenantId }, include: { patient: true, ward: true } });
      if (!admission) throw new NotFoundException('Admission not found');
      const newBed = await tx.bed.findFirst({ where: { id: newBedId, tenantId, status: 'AVAILABLE' } });
      if (!newBed) throw new BadRequestException('Target bed is not available');
      if (admission.bedId) await tx.bed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } });
      await tx.bed.update({ where: { id: newBedId }, data: { status: 'OCCUPIED' } });
      return tx.admission.update({ where: { id }, data: { bedId: newBedId, wardId: newBed.wardId } });
    });
  }

  async discharge(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findFirst({ where: { id, tenantId }, include: { patient: true, ward: true } });
      if (!admission) throw new NotFoundException('Admission not found');
      if (admission.bedId) await tx.bed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } });
      return tx.admission.update({
        where: { id },
        data: { status: 'DISCHARGED', dischargeDate: new Date(), dischargeType: dto.dischargeType, dischargeDiagnosis: dto.dischargeDiagnosis, dischargeSummary: dto.dischargeSummary },
      });
    });
  }
}
