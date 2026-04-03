import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Ayphen HMS</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from Ayphen HMS. Do not reply.
  </p>
</div>`;
}

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  async admit(tenantId: string, dto: any) {
    const admission = await generateSequentialId(this.prisma, {
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

    // Non-blocking email notification to patient
    this.prisma.patient.findUnique({ where: { id: dto.patientId }, select: { email: true, firstName: true, lastName: true } })
      .then((patient) => {
        if (patient?.email) {
          const admDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const wardName = (admission as any).ward?.name || 'N/A';
          sendEmail(
            patient.email,
            'Admission Confirmation - Ayphen HMS',
            emailTemplate('Admission Confirmation', `Dear ${patient.firstName} ${patient.lastName},<br><br>You have been admitted to our facility. Here are your admission details:<br><br><strong>Admission Number:</strong> ${(admission as any).admissionNumber}<br><strong>Ward:</strong> ${wardName}<br><strong>Date:</strong> ${admDate}<br><strong>Type:</strong> ${dto.admissionType || 'PLANNED'}<br><br>If you have any questions, please don't hesitate to contact the nursing station.`),
          ).catch((err) => console.error('Failed to send admission confirmation email:', err));
        }
      })
      .catch((err) => console.error('Failed to look up patient for admission email:', err));

    return admission;
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
    const discharged = await this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findFirst({ where: { id, tenantId }, include: { patient: true, ward: true } });
      if (!admission) throw new NotFoundException('Admission not found');
      if (admission.bedId) await tx.bed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } });
      return tx.admission.update({
        where: { id },
        data: { status: 'DISCHARGED', dischargeDate: new Date(), dischargeType: dto.dischargeType, dischargeDiagnosis: dto.dischargeDiagnosis, dischargeSummary: dto.dischargeSummary },
        include: { patient: true },
      });
    });

    // Non-blocking email notification to patient
    const patient = (discharged as any).patient;
    if (patient?.email) {
      const dischargeDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      sendEmail(
        patient.email,
        'Discharge Summary - Ayphen HMS',
        emailTemplate('Discharge Summary', `Dear ${patient.firstName} ${patient.lastName},<br><br>You have been discharged from our facility.<br><br><strong>Discharge Date:</strong> ${dischargeDate}<br><strong>Discharge Type:</strong> ${dto.dischargeType || 'REGULAR'}<br>${dto.dischargeDiagnosis ? `<strong>Diagnosis:</strong> ${dto.dischargeDiagnosis}<br>` : ''}<br>${dto.dischargeSummary ? `<strong>Follow-up Instructions:</strong><br>${dto.dischargeSummary}<br><br>` : ''}Please follow the prescribed medications and attend all follow-up appointments. We wish you a speedy recovery.`),
      ).catch((err) => console.error('Failed to send discharge email:', err));
    }

    return discharged;
  }
}
