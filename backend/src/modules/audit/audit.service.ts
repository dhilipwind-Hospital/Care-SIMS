import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(tenantId: string, dto: {
    eventType: string; actorId: string; actorName: string; actorRole: string;
    targetType?: string; targetId?: string; targetName?: string;
    locationId?: string; description: string; oldValue?: any; newValue?: any;
    ipAddress?: string; userAgent?: string; sessionId?: string;
  }) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ tenantId, ...dto, ts: Date.now() }))
      .digest('hex');
    return this.prisma.orgAuditLog.create({
      data: { tenantId, hash, ...dto, oldValue: dto.oldValue ?? undefined, newValue: dto.newValue ?? undefined },
    });
  }

  async getLogs(tenantId: string, query: any) {
    const { actorId, eventType, targetType, locationId, from, to, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (actorId) where.actorId = actorId;
    if (eventType) where.eventType = eventType;
    if (targetType) where.targetType = targetType;
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      this.prisma.orgAuditLog.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.orgAuditLog.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getPatientAccessLogs(tenantId: string, query: any) {
    const { patientId, actorId, isCrossLocation, from, to, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (actorId) where.actorId = actorId;
    if (isCrossLocation !== undefined) where.isCrossLocation = isCrossLocation === 'true';
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      this.prisma.patientAccessLog.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.patientAccessLog.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }
}
