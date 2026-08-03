import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}
  async list(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    const rows = await this.prisma.referral.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    return this.withPatient(tenantId, rows);
  }

  /**
   * Referral.patientId is a bare string with no Prisma `@relation`, so the list
   * screen and the printed referral letter both rendered a raw UUID where the
   * patient's name should be. Batch-resolve it here — one query for the page,
   * not one per row. Same shape as the doctor/department resolution in
   * appointments and OT.
   *
   * NOTE the name collision: `referral.patientId` is the Patient PRIMARY KEY,
   * while `patient.patientId` is the human MRN (SIMS-8062858). They are exposed
   * separately as `patient` / `patientMrn` so callers can't confuse them.
   */
  private async withPatient(tenantId: string, rows: any[]) {
    if (!rows.length) return rows;
    const ids = [...new Set(rows.map(r => r.patientId).filter(Boolean))] as string[];
    const patients = ids.length
      ? await this.prisma.patient.findMany({
          where: { id: { in: ids }, tenantId },
          select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, dateOfBirth: true, ageYears: true, mobile: true },
        })
      : [];
    const map = new Map<string, any>(patients.map(p => [p.id, p] as [string, any]));
    return rows.map(r => {
      const p = r.patientId ? map.get(r.patientId) : null;
      const age = p?.ageYears ?? (p?.dateOfBirth
        ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / 31557600000)
        : null);
      return {
        ...r,
        patient: p || null,
        patientName: p ? `${p.firstName} ${p.lastName}`.trim() : null,
        patientMrn: p?.patientId || null,
        patientAge: age,
      };
    });
  }
  async create(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'Referral',
      idColumn: 'referralNumber',
      prefix: 'REF-',
      tenantId,
      callback: async (tx, referralNumber) => {
        return tx.referral.create({ data: { tenantId, referralNumber, locationId: dto.locationId, patientId: dto.patientId, referringDoctorId: dto.referringDoctorId || '', referringDoctorName: dto.referringDoctorName || '', referredToDoctorId: dto.referredToDoctorId, referredToDoctorName: dto.referredToDoctorName, referredToDeptId: dto.referredToDeptId, referredToDeptName: dto.referredToDeptName, referralType: dto.referralType||'INTERNAL', urgency: dto.urgency||'ROUTINE', reason: dto.reason, clinicalSummary: dto.clinicalSummary, diagnosis: dto.diagnosis, status: 'PENDING' } });
      },
    });
  }
  async update(tenantId: string, id: string, dto: any) { const r = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Referral not found'); if (r.status !== 'PENDING') throw new BadRequestException('Only PENDING referrals can be edited'); return this.prisma.referral.update({ where: { id, tenantId }, data: { referredToDoctorId: dto.referredToDoctorId, referredToDoctorName: dto.referredToDoctorName, referredToDeptId: dto.referredToDeptId, referredToDeptName: dto.referredToDeptName, urgency: dto.urgency, reason: dto.reason, clinicalSummary: dto.clinicalSummary, diagnosis: dto.diagnosis } }); }
  async myReferrals(tenantId: string, doctorId: string) {
    const rows = await this.prisma.referral.findMany({ where: { tenantId, OR: [{ referringDoctorId: doctorId }, { referredToDoctorId: doctorId }] }, orderBy: { createdAt: 'desc' }, take: 500 });
    return this.withPatient(tenantId, rows);
  }
  async getOne(tenantId: string, id: string) {
    const r = await this.prisma.referral.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Referral not found');
    return (await this.withPatient(tenantId, [r]))[0];
  }
  async accept(tenantId: string, id: string) { const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!referral) throw new NotFoundException('Referral not found'); return this.prisma.referral.update({ where: { id, tenantId }, data: { status: 'ACCEPTED', acceptedAt: new Date() } }); }
  async decline(tenantId: string, id: string, reason: string) { const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!referral) throw new NotFoundException('Referral not found'); return this.prisma.referral.update({ where: { id, tenantId }, data: { status: 'DECLINED', declinedReason: reason } }); }
  async complete(tenantId: string, id: string, dto: any) { const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!referral) throw new NotFoundException('Referral not found'); return this.prisma.referral.update({ where: { id, tenantId }, data: { status: 'COMPLETED', completedAt: new Date(), consultationNotes: dto.consultationNotes } }); }

  async remove(tenantId: string, id: string) {
    const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } });
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.status !== 'PENDING') throw new BadRequestException('Only PENDING referrals can be deleted');
    await this.prisma.referral.update({ where: { id, tenantId }, data: { status: 'CANCELLED' } });
    return { message: 'Referral deleted successfully' };
  }
}
