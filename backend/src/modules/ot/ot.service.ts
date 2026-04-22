import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class OTService {
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async getRooms(tenantId: string, locationId?: string) {
    const where: any = { tenantId, isActive: true };
    if (locationId) where.locationId = locationId;
    return this.prisma.oTRoom.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getRoomsLiveStatus(tenantId: string, locationId?: string) {
    const where: any = { tenantId, isActive: true };
    if (locationId) where.locationId = locationId;
    const rooms = await this.prisma.oTRoom.findMany({ where, orderBy: { name: 'asc' } });
    const today = new Date(); today.setHours(0, 0, 0, 0);

    return Promise.all(rooms.map(async (room) => {
      const currentBooking = await this.prisma.oTBooking.findFirst({
        where: { otRoomId: room.id, status: 'IN_PROGRESS' },
      });
      const nextBooking = !currentBooking ? await this.prisma.oTBooking.findFirst({
        where: { otRoomId: room.id, status: 'SCHEDULED', scheduledDate: { gte: today } },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledStart: 'asc' }],
      }) : null;

      let status = 'AVAILABLE';
      if (currentBooking) status = 'IN_OPERATION';
      else if (nextBooking) status = 'SETUP';

      // Helper to resolve a person's name by ID (try tenantUser first, then doctorRegistry)
      const resolveName = async (id: string | null) => {
        if (!id) return null;
        const user = await this.prisma.tenantUser.findFirst({ where: { id }, select: { firstName: true, lastName: true } });
        if (user) return user;
        return this.prisma.doctorRegistry.findFirst({ where: { id }, select: { firstName: true, lastName: true } });
      };

      // Resolve patient + surgeon + anesthetist for active booking
      let currentBookingData = null;
      if (currentBooking) {
        const [patient, primarySurgeon, anesthetistDoc] = await Promise.all([
          this.prisma.patient.findFirst({ where: { id: currentBooking.patientId }, select: { firstName: true, lastName: true, patientId: true } }),
          resolveName(currentBooking.primarySurgeonId),
          resolveName(currentBooking.anesthetistId),
        ]);
        currentBookingData = {
          id: currentBooking.id,
          procedureName: currentBooking.procedureName,
          anesthesiaType: currentBooking.anesthesiaType,
          expectedDurationMins: currentBooking.expectedDurationMins,
          patient,
          primarySurgeon,
          anesthetist: anesthetistDoc,
        };
      }

      let nextBookingData = null;
      if (nextBooking) {
        const patient = await this.prisma.patient.findFirst({ where: { id: nextBooking.patientId }, select: { firstName: true, lastName: true } });
        nextBookingData = {
          id: nextBooking.id,
          procedureName: nextBooking.procedureName,
          scheduledStart: nextBooking.scheduledStart,
          scheduledDate: nextBooking.scheduledDate,
          patient,
        };
      }

      return {
        ...room,
        status,
        currentBooking: currentBookingData,
        nextBooking: nextBookingData,
        startTime: currentBooking?.actualStart || null,
      };
    }));
  }

  async createRoom(tenantId: string, dto: any) {
    return this.prisma.oTRoom.create({ data: { tenantId, locationId: dto.locationId, name: dto.name, type: dto.type, capacityClass: dto.capacityClass } });
  }

  async getEquipment(tenantId: string, query?: any) {
    const where: any = { tenantId };
    if (query?.condition) where.condition = query.condition;
    if (query?.sterilizationStatus) where.sterilizationStatus = query.sterilizationStatus;
    if (query?.otRoomId) where.otRoomId = query.otRoomId;
    return this.prisma.oTEquipment.findMany({ where, orderBy: { name: 'asc' }, take: 500, include: { otRoom: { select: { name: true } } } });
  }

  async createEquipment(tenantId: string, dto: any) {
    return this.prisma.oTEquipment.create({
      data: { tenantId, locationId: dto.locationId, name: dto.name, equipmentType: dto.equipmentType, serialNumber: dto.serialNumber, otRoomId: dto.otRoomId, condition: dto.condition || 'OPERATIONAL' },
      include: { otRoom: { select: { name: true } } },
    });
  }

  async sterilizeEquipment(tenantId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const eq = await tx.oTEquipment.findFirst({ where: { id, tenantId } });
      if (!eq) throw new NotFoundException('Equipment not found');
      const nextDue = new Date();
      nextDue.setHours(nextDue.getHours() + 24);
      return tx.oTEquipment.update({ where: { id }, data: { sterilizationStatus: 'STERILIZED', lastSterilizedAt: new Date(), sterilizedById: userId, nextSterilizationDue: nextDue } });
    });
  }

  async updateEquipmentCondition(tenantId: string, id: string, condition: string) {
    return this.prisma.$transaction(async (tx) => {
      const eq = await tx.oTEquipment.findFirst({ where: { id, tenantId } });
      if (!eq) throw new NotFoundException('Equipment not found');
      return tx.oTEquipment.update({ where: { id }, data: { condition } });
    });
  }

  async getBookings(tenantId: string, query: any) {
    const { date, otRoomId, locationId, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (otRoomId) where.otRoomId = otRoomId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (date) where.scheduledDate = new Date(date);
    const [data, total] = await Promise.all([
      this.prisma.oTBooking.findMany({ where, skip, take: Number(limit), orderBy: [{ scheduledDate: 'asc' }, { scheduledStart: 'asc' }], include: { otRoom: { select: { name: true } } } }),
      this.prisma.oTBooking.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async createBooking(tenantId: string, dto: any, createdById: string) {
    return generateSequentialId(this.prisma, {
      table: 'OTBooking',
      idColumn: 'bookingNumber',
      prefix: `OT-${new Date().getFullYear()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, bookingNumber) => {
        return tx.oTBooking.create({
          data: {
            tenantId, bookingNumber, locationId: dto.locationId, patientId: dto.patientId,
            admissionId: dto.admissionId, otRoomId: dto.otRoomId,
            primarySurgeonId: dto.primarySurgeonId, assistingSurgeons: dto.assistingSurgeons || [],
            anesthetistId: dto.anesthetistId, scrubNurseId: dto.scrubNurseId,
            departmentId: dto.departmentId, procedureName: dto.procedureName,
            procedureCode: dto.procedureCode, surgeryType: dto.surgeryType || 'ELECTIVE',
            anesthesiaType: dto.anesthesiaType, scheduledDate: new Date(dto.scheduledDate),
            scheduledStart: dto.scheduledStart, expectedDurationMins: dto.expectedDurationMins,
            bloodUnitsReserved: dto.bloodUnitsReserved || 0, notes: dto.notes, status: 'SCHEDULED', createdById,
          },
          include: { otRoom: true },
        });
      },
    });
  }

  async updateBooking(tenantId: string, id: string, dto: any) {
    const booking = await this.prisma.oTBooking.findFirst({ where: { id, tenantId } });
    if (!booking) throw new NotFoundException('OT Booking not found');
    const data: any = {};
    if (dto.otRoomId !== undefined) data.otRoomId = dto.otRoomId;
    if (dto.primarySurgeonId !== undefined) data.primarySurgeonId = dto.primarySurgeonId;
    if (dto.assistingSurgeons !== undefined) data.assistingSurgeons = dto.assistingSurgeons;
    if (dto.anesthetistId !== undefined) data.anesthetistId = dto.anesthetistId;
    if (dto.scrubNurseId !== undefined) data.scrubNurseId = dto.scrubNurseId;
    if (dto.procedureName !== undefined) data.procedureName = dto.procedureName;
    if (dto.procedureCode !== undefined) data.procedureCode = dto.procedureCode;
    if (dto.surgeryType !== undefined) data.surgeryType = dto.surgeryType;
    if (dto.anesthesiaType !== undefined) data.anesthesiaType = dto.anesthesiaType;
    if (dto.scheduledDate !== undefined) data.scheduledDate = new Date(dto.scheduledDate);
    if (dto.scheduledStart !== undefined) data.scheduledStart = dto.scheduledStart;
    if (dto.expectedDurationMins !== undefined) data.expectedDurationMins = dto.expectedDurationMins;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.preOpChecklist !== undefined) data.preOpChecklist = dto.preOpChecklist;
    return this.prisma.oTBooking.update({ where: { id }, data });
  }

  async getTimeline(tenantId: string, query: any) {
    const date = query.date ? new Date(query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);

    const where: any = { tenantId, scheduledDate: { gte: date, lt: nextDay } };
    if (query.locationId) where.locationId = query.locationId;

    const [rooms, bookings] = await Promise.all([
      this.prisma.oTRoom.findMany({ where: { tenantId, isActive: true, ...(query.locationId ? { locationId: query.locationId } : {}) }, orderBy: { name: 'asc' } }),
      this.prisma.oTBooking.findMany({
        where,
        orderBy: [{ scheduledStart: 'asc' }],
        include: { otRoom: { select: { name: true } } },
      }),
    ]);

    // Resolve patient names in batch
    const patientIds = [...new Set(bookings.map(b => b.patientId))];
    const patients = patientIds.length > 0
      ? await this.prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const patientMap = new Map(patients.map(p => [p.id, p]));

    // Resolve surgeon names in batch
    const surgeonIds = [...new Set(bookings.map(b => b.primarySurgeonId))];
    const surgeons = surgeonIds.length > 0
      ? await this.prisma.tenantUser.findMany({ where: { id: { in: surgeonIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const surgeonMap = new Map(surgeons.map(s => [s.id, s]));

    const enrichedBookings = bookings.map(b => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      otRoomId: b.otRoomId,
      roomName: (b as any).otRoom?.name,
      procedureName: b.procedureName,
      surgeryType: b.surgeryType,
      scheduledStart: b.scheduledStart,
      expectedDurationMins: b.expectedDurationMins,
      actualStart: b.actualStart,
      actualEnd: b.actualEnd,
      status: b.status,
      patient: patientMap.get(b.patientId) || null,
      surgeon: surgeonMap.get(b.primarySurgeonId) || null,
    }));

    return { date: date.toISOString().slice(0, 10), rooms, bookings: enrichedBookings };
  }

  async getPerformanceReport(tenantId: string, query: any) {
    const where: any = { tenantId, status: 'COMPLETED' };
    if (query.from) where.scheduledDate = { ...(where.scheduledDate || {}), gte: new Date(query.from) };
    if (query.to) where.scheduledDate = { ...(where.scheduledDate || {}), lte: new Date(query.to) };

    const completed = await this.prisma.oTBooking.findMany({ where, include: { otRoom: { select: { name: true } } } });

    // Resolve surgeon names
    const surgeonIds = [...new Set(completed.map(b => b.primarySurgeonId))];
    const surgeons = surgeonIds.length > 0
      ? await this.prisma.tenantUser.findMany({ where: { id: { in: surgeonIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const surgeonMap = new Map(surgeons.map(s => [s.id, s]));

    // By surgeon
    const bySurgeon: Record<string, { name: string; cases: number; totalMins: number }> = {};
    completed.forEach(b => {
      const key = b.primarySurgeonId;
      if (!bySurgeon[key]) {
        const s = surgeonMap.get(key);
        bySurgeon[key] = { name: s ? `Dr. ${s.firstName} ${s.lastName}` : 'Unknown', cases: 0, totalMins: 0 };
      }
      bySurgeon[key].cases++;
      if (b.actualStart && b.actualEnd) {
        bySurgeon[key].totalMins += Math.round((b.actualEnd.getTime() - b.actualStart.getTime()) / 60000);
      }
    });

    // By room
    const byRoom: Record<string, { name: string; cases: number; totalMins: number }> = {};
    completed.forEach(b => {
      const key = b.otRoomId;
      if (!byRoom[key]) byRoom[key] = { name: (b as any).otRoom?.name || 'Unknown', cases: 0, totalMins: 0 };
      byRoom[key].cases++;
      if (b.actualStart && b.actualEnd) {
        byRoom[key].totalMins += Math.round((b.actualEnd.getTime() - b.actualStart.getTime()) / 60000);
      }
    });

    // By surgery type
    const byType: Record<string, number> = {};
    completed.forEach(b => { byType[b.surgeryType] = (byType[b.surgeryType] || 0) + 1; });

    // Cancelled count
    const cancelled = await this.prisma.oTBooking.count({ where: { tenantId, status: 'CANCELLED', ...(query.from ? { scheduledDate: { gte: new Date(query.from) } } : {}) } });

    const totalMins = completed.reduce((s, b) => {
      if (b.actualStart && b.actualEnd) return s + Math.round((b.actualEnd.getTime() - b.actualStart.getTime()) / 60000);
      return s;
    }, 0);

    return {
      summary: {
        totalSurgeries: completed.length,
        cancelled,
        avgDurationMins: completed.length > 0 ? Math.round(totalMins / completed.length) : 0,
        totalOperatingMins: totalMins,
      },
      bySurgeon: Object.values(bySurgeon).sort((a, b) => b.cases - a.cases),
      byRoom: Object.values(byRoom).sort((a, b) => b.cases - a.cases),
      bySurgeryType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    };
  }

  async upsertPreOpAssessment(tenantId: string, bookingId: string, dto: any, userId: string) {
    const booking = await this.prisma.oTBooking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('OT Booking not found');
    return this.prisma.preOpAssessment.upsert({
      where: { bookingId },
      update: { ...dto, assessedById: userId },
      create: { tenantId, bookingId, patientId: booking.patientId, assessedById: userId, ...dto },
    });
  }

  async getPreOpAssessment(tenantId: string, bookingId: string) {
    return this.prisma.preOpAssessment.findUnique({ where: { bookingId } }) || null;
  }

  async startProcedure(tenantId: string, id: string) {
    const booking = await this.prisma.oTBooking.findFirst({ where: { id, tenantId } });
    if (!booking) throw new NotFoundException('OT Booking not found');
    const updated = await this.prisma.oTBooking.update({ where: { id }, data: { status: 'IN_PROGRESS', actualStart: new Date() } });
    this.ws.emitToTenant(tenantId, 'ot:status:changed', { action: 'started', booking: updated });
    return updated;
  }

  async completeProcedure(tenantId: string, id: string, dto: any) {
    const booking = await this.prisma.oTBooking.findFirst({ where: { id, tenantId } });
    if (!booking) throw new NotFoundException('OT Booking not found');
    const data: any = { status: 'COMPLETED', actualEnd: new Date(), intraOpNotes: dto.intraOpNotes, postOpNotes: dto.postOpNotes };
    if (dto.estimatedBloodLoss !== undefined) data.estimatedBloodLoss = dto.estimatedBloodLoss;
    if (dto.bloodUnitsUsed !== undefined) data.bloodUnitsUsed = dto.bloodUnitsUsed;
    if (dto.specimens !== undefined) data.specimens = dto.specimens;
    if (dto.implants !== undefined) data.implants = dto.implants;
    if (dto.complications !== undefined) data.complications = dto.complications;
    if (dto.drainInserted !== undefined) data.drainInserted = dto.drainInserted;
    if (dto.drainType !== undefined) data.drainType = dto.drainType;
    const updated = await this.prisma.oTBooking.update({ where: { id }, data });
    this.ws.emitToTenant(tenantId, 'ot:status:changed', { action: 'completed', booking: updated });
    return updated;
  }
}
