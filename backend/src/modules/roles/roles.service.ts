import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.tenantRole.findMany({ where: { tenantId, isActive: true }, include: { _count: { select: { users: true } } }, orderBy: { name: 'asc' } });
  }

  async findOne(tenantId: string, id: string) {
    const role = await this.prisma.tenantRole.findFirst({ where: { id, tenantId }, include: { permissions: true, specialFlags: true, _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantId: string, dto: any, createdById: string) {
    const role = await this.prisma.tenantRole.create({ data: { tenantId, name: dto.name, description: dto.description, isSystemRole: false, isActive: true, createdById } });
    if (dto.permissions?.length) await this.prisma.tenantRolePermission.createMany({ data: dto.permissions.map((p: any) => ({ roleId: role.id, moduleId: p.moduleId, resource: p.resource, action: p.action })) });
    if (dto.specialFlags?.length) await this.prisma.tenantRoleSpecialFlag.createMany({ data: dto.specialFlags.map((f: string) => ({ roleId: role.id, flag: f, isEnabled: true })) });
    return this.findOne(tenantId, role.id);
  }

  async update(tenantId: string, id: string, dto: any) {
    const role = await this.findOne(tenantId, id);
    if (role.isSystemRole) throw new BadRequestException('Cannot rename system roles');
    return this.prisma.tenantRole.update({ where: { id }, data: { name: dto.name, description: dto.description } });
  }

  async remove(tenantId: string, id: string) {
    const role = await this.findOne(tenantId, id);
    if (role.isSystemRole) throw new BadRequestException('Cannot delete system roles');
    const count = await this.prisma.tenantUser.count({ where: { roleId: id } });
    if (count > 0) throw new BadRequestException(`${count} user(s) are still assigned this role`);
    return this.prisma.tenantRole.update({ where: { id }, data: { isActive: false } });
  }

  async updatePermissions(tenantId: string, roleId: string, permissions: any[]) {
    await this.findOne(tenantId, roleId);
    await this.prisma.tenantRolePermission.deleteMany({ where: { roleId } });
    if (permissions?.length) await this.prisma.tenantRolePermission.createMany({ data: permissions.map((p: any) => ({ roleId, moduleId: p.moduleId, resource: p.resource, action: p.action })) });
    return this.findOne(tenantId, roleId);
  }

  async updateSpecialFlags(tenantId: string, roleId: string, flags: string[]) {
    await this.findOne(tenantId, roleId);
    await this.prisma.tenantRoleSpecialFlag.deleteMany({ where: { roleId } });
    if (flags?.length) await this.prisma.tenantRoleSpecialFlag.createMany({ data: flags.map((f) => ({ roleId, flag: f, isEnabled: true })) });
    return this.findOne(tenantId, roleId);
  }
}
