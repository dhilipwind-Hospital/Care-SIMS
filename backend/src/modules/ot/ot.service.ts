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
