import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any, issuedById: string) {
    return generateSequentialId(this.prisma, {
      table: 'MedicalCertificate',
      idColumn: 'certificateNumber',
      prefix: `CERT-${new Date().getFullYear()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, certificateNumber) => {
        return tx.medicalCertificate.create({
          data: {
            tenantId, certificateNumber, patientId: dto.patientId,
            certificateType: dto.certificateType,
            issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : new Date(),
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
            findings: dto.findings, recommendations: dto.recommendations,
            restrictions: dto.restrictions, customBody: dto.customBody,
            issuedById, notes: dto.notes,
          },
          include: { patient: { select: { firstName: true, lastName: true, patientId: true, gender: true, ageYears: true } } },
        });
      },
    });
  }

  async findAll(tenantId: string, query: any) {
    const { patientId, type, from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (type) where.certificateType = type;
    if (from || to) { where.issuedDate = {}; if (from) where.issuedDate.gte = new Date(from); if (to) where.issuedDate.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.medicalCertificate.findMany({
        where, skip, take: Number(limit), orderBy: { issuedDate: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true, patientId: true } } },
      }),
      this.prisma.medicalCertificate.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const cert = await this.prisma.medicalCertificate.findFirst({
      where: { id, tenantId },
      include: { patient: true },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async markPrinted(tenantId: string, id: string) {
    const cert = await this.prisma.medicalCertificate.findFirst({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Certificate not found');
    return this.prisma.medicalCertificate.update({ where: { id }, data: { printedAt: new Date() } });
  }
}
