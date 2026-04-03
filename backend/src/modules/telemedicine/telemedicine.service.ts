import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
@Injectable()
export class TelemedicineService {
  constructor(private prisma: PrismaService) {}
  async list(tenantId: string, status?: string, doctorId?: string) { const where: any = { tenantId }; if (status) where.status = status; if (doctorId) where.doctorId = doctorId; return this.prisma.teleconsultSession.findMany({ where, orderBy: { scheduledAt: 'desc' }, take: 500 }); }
  async create(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'TeleconsultSession',
      idColumn: 'sessionCode',
      prefix: 'TLC-',
      tenantId,
      callback: async (tx, sessionCode) => {
        return tx.teleconsultSession.create({ data: { tenantId, sessionCode, locationId: dto.locationId, patientId: dto.patientId, doctorId: dto.doctorId, appointmentId: dto.appointmentId, sessionType: dto.sessionType||'VIDEO', scheduledAt: new Date(dto.scheduledAt), status: 'SCHEDULED' } });
      },
    });
  }
  async getOne(tenantId: string, id: string) { const s = await this.prisma.teleconsultSession.findFirst({ where: { id, tenantId } }); if (!s) throw new NotFoundException('Session not found'); return s; }
  async start(tenantId: string, id: string) { const session = await this.prisma.teleconsultSession.findFirst({ where: { id, tenantId } }); if (!session) throw new NotFoundException('Session not found'); return this.prisma.teleconsultSession.update({ where: { id }, data: { startedAt: new Date(), status: 'IN_PROGRESS' } }); }
  async end(tenantId: string, id: string) { const s = await this.prisma.teleconsultSession.findFirst({ where: { id, tenantId } }); if (!s) throw new NotFoundException('Session not found'); const dur = s?.startedAt ? Math.round((Date.now() - s.startedAt.getTime()) / 60000) : 0; return this.prisma.teleconsultSession.update({ where: { id }, data: { endedAt: new Date(), durationMinutes: dur, status: 'COMPLETED' } }); }
  async cancel(tenantId: string, id: string, reason: string) { const session = await this.prisma.teleconsultSession.findFirst({ where: { id, tenantId } }); if (!session) throw new NotFoundException('Session not found'); return this.prisma.teleconsultSession.update({ where: { id }, data: { status: 'CANCELLED', cancelledReason: reason } }); }
  async remove(tenantId: string, id: string) {
    const session = await this.prisma.teleconsultSession.findFirst({ where: { id, tenantId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled sessions can be deleted');
    return this.prisma.teleconsultSession.delete({ where: { id } });
  }
}
