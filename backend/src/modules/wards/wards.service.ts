import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { sendEmail } from '../../common/utils/mailer';

@Injectable()
export class WardsService {
  private readonly logger = new Logger(WardsService.name);
  constructor(private prisma: PrismaService) {}

  async getWards(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    return this.prisma.ward.findMany({ where, include: { beds: true, _count: { select: { admissions: { where: { status: 'ACTIVE' } } } } }, orderBy: { name: 'asc' } });
  }

  async createWard(tenantId: string, dto: any) {
    return this.prisma.ward.create({ data: { tenantId, locationId: dto.locationId, name: dto.name, code: dto.code, type: dto.type, totalBeds: dto.totalBeds, floor: dto.floor, phoneExtension: dto.phoneExtension, chargeNurseId: dto.chargeNurseId, isIsolation: dto.isIsolation || false } });
  }

  async updateWard(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findFirst({ where: { id, tenantId } });
      if (!ward) throw new NotFoundException('Ward not found');
      const data: any = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.code !== undefined) data.code = dto.code;
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.totalBeds !== undefined) data.totalBeds = dto.totalBeds;
      if (dto.floor !== undefined) data.floor = dto.floor;
      if (dto.phoneExtension !== undefined) data.phoneExtension = dto.phoneExtension;
      if (dto.chargeNurseId !== undefined) data.chargeNurseId = dto.chargeNurseId;
      if (dto.isIsolation !== undefined) data.isIsolation = dto.isIsolation;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      return tx.ward.update({ where: { id }, data });
    });
  }

  async getBeds(tenantId: string, wardId: string) {
    return this.prisma.bed.findMany({ where: { tenantId, wardId }, include: { ward: { select: { name: true, code: true } }, admissions: { where: { status: 'ACTIVE' }, include: { patient: { select: { patientId: true, firstName: true, lastName: true } } } } }, orderBy: { bedNumber: 'asc' } });
  }

  async addBed(tenantId: string, wardId: string, dto: any) {
    const ward = await this.prisma.ward.findFirst({ where: { id: wardId, tenantId } });
    if (!ward) throw new NotFoundException('Ward not found');
    return this.prisma.bed.create({ data: { tenantId, wardId, bedNumber: dto.bedNumber, type: dto.type || 'GENERAL', status: 'AVAILABLE' } });
  }

  async getBedOccupancy(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const wards = await this.prisma.ward.findMany({ where, include: { beds: true } });
    return wards.map(w => ({ wardId: w.id, wardName: w.name, totalBeds: w.totalBeds, availableBeds: w.beds.filter(b => b.status === 'AVAILABLE').length, occupiedBeds: w.beds.filter(b => b.status === 'OCCUPIED').length, reservedBeds: w.beds.filter(b => b.status === 'RESERVED').length, maintenanceBeds: w.beds.filter(b => b.status === 'MAINTENANCE').length }));
  }

  async updateBedStatus(tenantId: string, bedId: string, status: string) {
    const { prevStatus, updated } = await this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findFirst({ where: { id: bedId, tenantId } });
      if (!bed) throw new NotFoundException('Bed not found');
      const u = await tx.bed.update({ where: { id: bedId }, data: { status } });
      return { prevStatus: bed.status, updated: u };
    });

    if (prevStatus !== 'AVAILABLE' && status === 'AVAILABLE') {
      this.notifyBedAvailable(tenantId, updated).catch((err) =>
        this.logger.error('Failed to send bed-available email', err as any),
      );
    }

    return updated;
  }

  private async notifyBedAvailable(tenantId: string, bed: any) {
    const [ward, tenant, recipients] = await Promise.all([
      this.prisma.ward.findFirst({ where: { id: bed.wardId, tenantId }, select: { name: true, code: true, locationId: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } }),
      this.prisma.tenantUser.findMany({
        where: { tenantId, isActive: true, role: { systemRoleId: { in: ['SYS_ADMIN', 'SYS_RECEPTION'] } } },
        select: { email: true },
        take: 10,
      }).catch(() => [] as any[]),
    ]);
    const emails = (recipients as any[]).map((r) => r.email).filter(Boolean);
    if (emails.length === 0) return;

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const wardLabel = ward ? `${ward.name}${ward.code ? ` (${ward.code})` : ''}` : 'Ward';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${orgName}</h1>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1f2937;margin:0 0 16px;">Bed Available</h2>
          <p style="color:#4b5563;line-height:1.6;">A bed has just become available and is ready for the next admission.</p>
          <p style="color:#4b5563;font-size:13px;">
            <strong>Ward:</strong> ${wardLabel}<br/>
            <strong>Bed:</strong> ${bed.bedNumber}<br/>
            <strong>Type:</strong> ${bed.type || 'GENERAL'}
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Please check the admissions queue and assign accordingly.</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This is an automated message from ${orgName}. Do not reply.</p>
      </div>`;
    const subject = `Bed Available - ${wardLabel} Bed ${bed.bedNumber} - ${orgName}`;
    for (const to of emails) {
      sendEmail(to, subject, html).catch((err) => this.logger.error(`Failed to send bed-available email to ${to}`, err));
    }
  }
}
