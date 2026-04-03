import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}
  async list(tenantId: string, status?: string) { const where: any = { tenantId }; if (status) where.status = status; return this.prisma.referral.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }); }
  async create(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'Referral',
      idColumn: 'referralNumber',
      prefix: 'REF-',
      tenantId,
      callback: async (tx, referralNumber) => {
        return tx.referral.create({ data: { tenantId, referralNumber, locationId: dto.locationId, patientId: dto.patientId, referringDoctorId: dto.referringDoctorId, referringDoctorName: dto.referringDoctorName, referredToDoctorId: dto.referredToDoctorId, referredToDoctorName: dto.referredToDoctorName, referredToDeptId: dto.referredToDeptId, referredToDeptName: dto.referredToDeptName, referralType: dto.referralType||'INTERNAL', urgency: dto.urgency||'ROUTINE', reason: dto.reason, clinicalSummary: dto.clinicalSummary, diagnosis: dto.diagnosis, status: 'PENDING' } });
      },
    });
  }
  async update(tenantId: string, id: string, dto: any) { const r = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Referral not found'); if (r.status !== 'PENDING') throw new BadRequestException('Only PENDING referrals can be edited'); return this.prisma.referral.update({ where: { id }, data: { referredToDoctorId: dto.referredToDoctorId, referredToDoctorName: dto.referredToDoctorName, referredToDeptId: dto.referredToDeptId, referredToDeptName: dto.referredToDeptName, urgency: dto.urgency, reason: dto.reason, clinicalSummary: dto.clinicalSummary, diagnosis: dto.diagnosis } }); }
  async myReferrals(tenantId: string, doctorId: string) { return this.prisma.referral.findMany({ where: { tenantId, OR: [{ referringDoctorId: doctorId }, { referredToDoctorId: doctorId }] }, orderBy: { createdAt: 'desc' }, take: 500 }); }
  async getOne(tenantId: string, id: string) { const r = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Referral not found'); return r; }
  async accept(tenantId: string, id: string) { const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!referral) throw new NotFoundException('Referral not found'); return this.prisma.referral.update({ where: { id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } }); }
  async decline(tenantId: string, id: string, reason: string) { const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!referral) throw new NotFoundException('Referral not found'); return this.prisma.referral.update({ where: { id }, data: { status: 'DECLINED', declinedReason: reason } }); }
  async complete(tenantId: string, id: string, dto: any) { const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } }); if (!referral) throw new NotFoundException('Referral not found'); return this.prisma.referral.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), consultationNotes: dto.consultationNotes } }); }

  async remove(tenantId: string, id: string) {
    const referral = await this.prisma.referral.findFirst({ where: { id, tenantId } });
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.status !== 'PENDING') throw new BadRequestException('Only PENDING referrals can be deleted');
    await this.prisma.referral.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { message: 'Referral deleted successfully' };
  }
}
