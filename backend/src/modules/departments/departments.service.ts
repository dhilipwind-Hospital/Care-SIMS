import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, locationId?: string) {
    const where: any = { tenantId, isActive: true };
    if (locationId) where.locationId = locationId;
    return this.prisma.department.findMany({ where, orderBy: { sortOrder: 'asc' } });
  }

  create(tenantId: string, dto: any) {
    const { name, code, type, locationId, headUserId, phoneExt, colorCode, sortOrder } = dto;
    return this.prisma.department.create({
      data: {
        tenantId,
        name,
        code,
        ...(type && { type }),
        ...(locationId && { locationId }),
        ...(headUserId && { headUserId }),
        ...(phoneExt && { phoneExt }),
        ...(colorCode && { colorCode }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const department = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!department) throw new NotFoundException('Department not found');
    const { name, code, type, locationId, headUserId, phoneExt, colorCode, sortOrder, isActive } = dto;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (type !== undefined) data.type = type;
    if (locationId !== undefined) data.locationId = locationId;
    if (headUserId !== undefined) data.headUserId = headUserId;
    if (phoneExt !== undefined) data.phoneExt = phoneExt;
    if (colorCode !== undefined) data.colorCode = colorCode;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;
    return this.prisma.department.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const department = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!department) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: { isActive: false } });
  }
}
