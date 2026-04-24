import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DutyRosterService {
  constructor(private prisma: PrismaService) {}

  // ── Roster CRUD ──

  async createShift(tenantId: string, dto: any, createdById: string) {
    // Check for conflicts
    const conflict = await this.prisma.dutyRoster.findFirst({
      where: { tenantId, staffId: dto.staffId, shiftDate: new Date(dto.shiftDate), status: { notIn: ['ON_LEAVE', 'SWAPPED'] } },
    });
    if (conflict) throw new BadRequestException('Staff already has a shift on this date');

    return this.prisma.dutyRoster.create({
      data: {
        tenantId, staffId: dto.staffId, departmentId: dto.departmentId,
        locationId: dto.locationId, shiftDate: new Date(dto.shiftDate),
        shiftType: dto.shiftType || 'GENERAL',
        startTime: dto.startTime, endTime: dto.endTime,
        notes: dto.notes, createdById,
      },
    });
  }

  async bulkCreate(tenantId: string, dto: any, createdById: string) {
    const results = [];
    for (const shift of dto.shifts || []) {
      try {
        const created = await this.createShift(tenantId, shift, createdById);
        results.push({ success: true, shift: created });
      } catch (err: any) {
        results.push({ success: false, staffId: shift.staffId, date: shift.shiftDate, error: err.message });
      }
    }
    return { created: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, details: results };
  }

  async getRoster(tenantId: string, query: any) {
    const { staffId, departmentId, from, to, status, page = 1, limit = 100 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (staffId) where.staffId = staffId;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (from || to) { where.shiftDate = {}; if (from) where.shiftDate.gte = new Date(from); if (to) where.shiftDate.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.dutyRoster.findMany({ where, skip, take: Number(limit), orderBy: [{ shiftDate: 'asc' }, { startTime: 'asc' }] }),
      this.prisma.dutyRoster.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getMyRoster(tenantId: string, staffId: string, query: any) {
    const { from, to } = query;
    const where: any = { tenantId, staffId };
    if (from || to) { where.shiftDate = {}; if (from) where.shiftDate.gte = new Date(from); if (to) where.shiftDate.lte = new Date(to); }
    return this.prisma.dutyRoster.findMany({ where, orderBy: { shiftDate: 'asc' } });
  }

  async updateShift(tenantId: string, id: string, dto: any) {
    const shift = await this.prisma.dutyRoster.findFirst({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');
    const data: any = {};
    if (dto.shiftType !== undefined) data.shiftType = dto.shiftType;
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.dutyRoster.update({ where: { id }, data });
  }

  async deleteShift(tenantId: string, id: string) {
    const shift = await this.prisma.dutyRoster.findFirst({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');
    await this.prisma.dutyRoster.delete({ where: { id } });
    return { message: 'Shift deleted' };
  }

  async requestSwap(tenantId: string, id: string, swapWithStaffId: string) {
    const shift = await this.prisma.dutyRoster.findFirst({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');
    return this.prisma.dutyRoster.update({ where: { id }, data: { swapRequestedWith: swapWithStaffId } });
  }

  async approveSwap(tenantId: string, id: string, approvedById: string) {
    const shift = await this.prisma.dutyRoster.findFirst({ where: { id, tenantId } });
    if (!shift || !shift.swapRequestedWith) throw new BadRequestException('No swap request pending');
    return this.prisma.dutyRoster.update({ where: { id }, data: { status: 'SWAPPED', swapApprovedById: approvedById, swapApprovedAt: new Date() } });
  }

  // ── Leave Management ──

  async applyLeave(tenantId: string, staffId: string, dto: any) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return this.prisma.leaveRequest.create({
      data: { tenantId, staffId, leaveType: dto.leaveType, startDate, endDate, totalDays, reason: dto.reason, notes: dto.notes },
    });
  }

  async getLeaves(tenantId: string, query: any) {
    const { staffId, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async approveLeave(tenantId: string, id: string, approvedById: string) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id, tenantId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    // Mark roster shifts as ON_LEAVE for the leave period
    await this.prisma.dutyRoster.updateMany({
      where: { tenantId, staffId: leave.staffId, shiftDate: { gte: leave.startDate, lte: leave.endDate }, status: 'SCHEDULED' },
      data: { status: 'ON_LEAVE' },
    });
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'APPROVED', approvedById, approvedAt: new Date() } });
  }

  async rejectLeave(tenantId: string, id: string, approvedById: string, reason: string) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id, tenantId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED', approvedById, approvedAt: new Date(), rejectionReason: reason } });
  }

  async cancelLeave(tenantId: string, id: string, staffId: string) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id, tenantId, staffId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status === 'APPROVED') {
      // Restore roster shifts
      await this.prisma.dutyRoster.updateMany({
        where: { tenantId, staffId, shiftDate: { gte: leave.startDate, lte: leave.endDate }, status: 'ON_LEAVE' },
        data: { status: 'SCHEDULED' },
      });
    }
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  // ── Dashboard ──

  async dashboard(tenantId: string, query: any) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    const [todayShifts, weekShifts, pendingLeaves, onLeaveToday] = await Promise.all([
      this.prisma.dutyRoster.count({ where: { tenantId, shiftDate: { gte: today, lt: tomorrow }, status: { notIn: ['ON_LEAVE', 'SWAPPED'] } } }),
      this.prisma.dutyRoster.count({ where: { tenantId, shiftDate: { gte: today, lte: weekEnd }, status: { notIn: ['ON_LEAVE', 'SWAPPED'] } } }),
      this.prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.dutyRoster.count({ where: { tenantId, shiftDate: { gte: today, lt: tomorrow }, status: 'ON_LEAVE' } }),
    ]);

    return { todayShifts, weekShifts, pendingLeaves, onLeaveToday };
  }
}
