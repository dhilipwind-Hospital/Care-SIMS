import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StaffAttendanceService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, date?: string, departmentId?: string) {
    const where: any = { tenantId };
    if (date) where.attendanceDate = new Date(date);
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.staffAttendance.findMany({ where, orderBy: { attendanceDate: 'desc' }, take: 500 });
  }

  async clockIn(tenantId: string, userId: string, userName: string, dto: any) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.staffAttendance.findFirst({ where: { tenantId, userId, attendanceDate: today } });
    if (existing) throw new ConflictException('Already clocked in today');
    return this.prisma.staffAttendance.create({
      data: { tenantId, locationId: dto.locationId, userId, userName, departmentId: dto.departmentId, attendanceDate: today, shiftType: dto.shiftType || 'GENERAL', clockIn: new Date(), status: 'PRESENT' },
    });
  }

  async clockOut(tenantId: string, userId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rec = await this.prisma.staffAttendance.findFirst({ where: { tenantId, userId, attendanceDate: today } });
    if (!rec) throw new ConflictException('No clock-in record found for today');
    return this.prisma.staffAttendance.update({ where: { id: rec.id }, data: { clockOut: new Date() } });
  }

  async markAttendance(tenantId: string, dto: any) {
    return this.prisma.staffAttendance.create({
      data: { tenantId, locationId: dto.locationId, userId: dto.userId, userName: dto.userName, departmentId: dto.departmentId, attendanceDate: new Date(dto.attendanceDate), shiftType: dto.shiftType, status: dto.status || 'PRESENT', leaveType: dto.leaveType, leaveReason: dto.leaveReason, notes: dto.notes },
    });
  }

  async myAttendance(tenantId: string, userId: string, month?: string) {
    const where: any = { tenantId, userId };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.attendanceDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    return this.prisma.staffAttendance.findMany({ where, orderBy: { attendanceDate: 'desc' }, take: 500 });
  }

  async summary(tenantId: string, month: string) {
    const [y, m] = month.split('-').map(Number);
    const records = await this.prisma.staffAttendance.findMany({
      where: { tenantId, attendanceDate: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } },
      take: 500,
    });
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const leave = records.filter(r => r.status === 'ON_LEAVE').length;
    return { total: records.length, present, absent, leave };
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.staffAttendance.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Record not found');
      return tx.staffAttendance.update({ where: { id }, data: { shiftType: dto.shiftType, status: dto.status, leaveType: dto.leaveType, leaveReason: dto.leaveReason, notes: dto.notes } });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.staffAttendance.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Record not found');
      return tx.staffAttendance.delete({ where: { id } });
    });
  }
}
