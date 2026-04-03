import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { doctorId, locationId, date, status, patientId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (doctorId) where.doctorId = doctorId;
    if (locationId) where.locationId = locationId;
    if (date) where.appointmentDate = new Date(date);
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({ where, skip, take: Number(limit), orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }], include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } } }),
      this.prisma.appointment.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async create(tenantId: string, dto: any, createdById: string) {
    // Auto-resolve locationId from user's primary location if not provided
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: createdById }, select: { primaryLocationId: true } });
      locationId = user?.primaryLocationId;
    }
    return this.prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({ where: { tenantId, doctorId: dto.doctorId, appointmentDate: new Date(dto.appointmentDate), appointmentTime: dto.appointmentTime || dto.slotTime, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } });
      if (conflict) throw new BadRequestException('Doctor already has an appointment at this time slot');
      return tx.appointment.create({
        data: { tenantId, locationId, patientId: dto.patientId, doctorId: dto.doctorId, departmentId: dto.departmentId, appointmentDate: new Date(dto.appointmentDate), appointmentTime: dto.appointmentTime || dto.slotTime, durationMinutes: dto.durationMinutes || 15, type: dto.type || dto.appointmentType || 'NEW', source: dto.source || 'RECEPTION', chiefComplaint: dto.chiefComplaint, notes: dto.notes, status: 'SCHEDULED', createdById },
        include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } },
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId }, include: { patient: true } });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({ where: { id, tenantId } });
      if (!appt) throw new NotFoundException('Appointment not found');
      const data: any = {};
      if (dto.appointmentDate !== undefined) data.appointmentDate = new Date(dto.appointmentDate);
      if (dto.appointmentTime !== undefined) data.appointmentTime = dto.appointmentTime;
      if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
      if (dto.doctorId !== undefined) data.doctorId = dto.doctorId;
      if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.chiefComplaint !== undefined) data.chiefComplaint = dto.chiefComplaint;
      if (dto.notes !== undefined) data.notes = dto.notes;
      if (dto.status !== undefined) data.status = dto.status;
      return tx.appointment.update({ where: { id }, data });
    });
  }

  async cancel(tenantId: string, id: string, reason: string, cancelledById: string) {
    return this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({ where: { id, tenantId } });
      if (!appt) throw new NotFoundException('Appointment not found');
      return tx.appointment.update({ where: { id }, data: { status: 'CANCELLED', cancellationReason: reason, cancelledById, cancelledAt: new Date() } });
    });
  }

  async getDoctorSlots(tenantId: string, doctorId: string, date: string, locationId: string) {
    const aff = await this.prisma.doctorOrgAffiliation.findFirst({ where: { tenantId, doctorId, isActive: true } });
    if (!aff) throw new NotFoundException('Doctor affiliation not found');
    const booked = await this.prisma.appointment.findMany({ where: { tenantId, doctorId, appointmentDate: new Date(date), status: { notIn: ['CANCELLED', 'NO_SHOW'] } }, select: { appointmentTime: true } });
    const bookedTimes = new Set(booked.map(a => a.appointmentTime));
    const slots = this.generateTimeSlots('09:00', '18:00', aff.slotDurationMinutes);
    return slots.map(slot => ({ time: slot, available: !bookedTimes.has(slot) }));
  }

  private generateTimeSlots(start: string, end: string, durationMins: number) {
    const slots: string[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let current = sh * 60 + sm;
    const endMins = eh * 60 + em;
    while (current < endMins) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += durationMins;
    }
    return slots;
  }
}
