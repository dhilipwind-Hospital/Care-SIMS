import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class OTService {
  private readonly logger = new Logger(OTService.name);
  constructor(private prisma: PrismaService, private ws: WsGateway, private billing: BillingService) {}

  // Compute the [start, end] minute window for a booking. scheduledStart is
  // "HH:MM"; we add expectedDurationMins to get the projected end. Returns
  // null if start time is malformed so the caller can skip the conflict
  // check (we never want to crash the booking flow over a parse error).
  private bookingWindow(scheduledDate: Date, scheduledStart: string, durationMins: number): { startMs: number; endMs: number } | null {
    if (!scheduledStart || typeof scheduledStart !== 'string') return null;
    const [h, m] = scheduledStart.split(':').map((x) => Number(x));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const base = new Date(scheduledDate);
    base.setHours(h, m, 0, 0);
    const startMs = base.getTime();
    const endMs = startMs + Math.max(15, Number(durationMins) || 60) * 60000;
    return { startMs, endMs };
  }

  // True iff two windows overlap (strict: same-time touching does not count).
  private windowsOverlap(a: { startMs: number; endMs: number }, b: { startMs: number; endMs: number }): boolean {
    return a.startMs < b.endMs && b.startMs < a.endMs;
  }

  // Look for any SCHEDULED / IN_PROGRESS booking that overlaps the given
  // window for the given surgeon, patient, or room. Excludes a booking id
  // (for edits). Returns the offending booking with a tag identifying which
  // resource conflicted, or null.
  private async findConflict(
    tenantId: string,
    win: { startMs: number; endMs: number },
    surgeonId: string,
    patientId: string,
    otRoomId: string,
    scheduledDate: Date,
    excludeId?: string,
  ): Promise<{ kind: 'SURGEON' | 'PATIENT' | 'ROOM'; booking: any } | null> {
    const dayStart = new Date(scheduledDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const candidates = await this.prisma.oTBooking.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: { gte: dayStart, lt: dayEnd },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          { primarySurgeonId: surgeonId },
          { patientId },
          { otRoomId },
        ],
      },
    });
    for (const c of candidates) {
      const other = this.bookingWindow(c.scheduledDate, c.scheduledStart, c.expectedDurationMins);
      if (!other) continue;
      if (!this.windowsOverlap(win, other)) continue;
      if (c.primarySurgeonId === surgeonId) return { kind: 'SURGEON', booking: c };
      if (c.patientId === patientId) return { kind: 'PATIENT', booking: c };
      if (c.otRoomId === otRoomId) return { kind: 'ROOM', booking: c };
    }
    return null;
  }

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
      return tx.oTEquipment.update({ where: { id, tenantId }, data: { sterilizationStatus: 'STERILIZED', lastSterilizedAt: new Date(), sterilizedById: userId, nextSterilizationDue: nextDue } });
    });
  }

  async updateEquipmentCondition(tenantId: string, id: string, condition: string) {
    return this.prisma.$transaction(async (tx) => {
      const eq = await tx.oTEquipment.findFirst({ where: { id, tenantId } });
      if (!eq) throw new NotFoundException('Equipment not found');
      return tx.oTEquipment.update({ where: { id, tenantId }, data: { condition } });
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
    // Resolve locationId: prefer DTO, then OT room's location, then tenant's
    // first active location. Required because OTBooking.locationId is NOT NULL
    // and the controller can pass an undefined locationId when the calling
    // user has no primaryLocationId (e.g. org admins seeded without one).
    if (!dto.locationId && dto.otRoomId) {
      const room = await this.prisma.oTRoom.findFirst({ where: { id: dto.otRoomId, tenantId }, select: { locationId: true } });
      if (room?.locationId) dto.locationId = room.locationId;
    }
    if (!dto.locationId) {
      const firstLoc = await this.prisma.tenantLocation.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
      if (firstLoc?.id) dto.locationId = firstLoc.id;
    }
    if (!dto.locationId) {
      throw new BadRequestException('Cannot create booking: no active location found for this tenant.');
    }

    // Conflict check — block the booking if surgeon, patient or room is
    // already occupied in the requested window. Defensive: if we can't
    // parse the time we skip the check (window calc returns null).
    const scheduledDate = new Date(dto.scheduledDate);
    const win = this.bookingWindow(scheduledDate, dto.scheduledStart, dto.expectedDurationMins);
    if (win) {
      const conflict = await this.findConflict(
        tenantId, win, dto.primarySurgeonId, dto.patientId, dto.otRoomId, scheduledDate,
      );
      if (conflict) {
        const label =
          conflict.kind === 'SURGEON' ? `the primary surgeon is already booked (${conflict.booking.bookingNumber})` :
          conflict.kind === 'PATIENT' ? `the patient already has another OT booking (${conflict.booking.bookingNumber})` :
          `the OT room is already booked (${conflict.booking.bookingNumber})`;
        throw new BadRequestException(`Cannot create booking: ${label} in the requested time window.`);
      }
    }

    let booking: any;
    try {
      booking = await generateSequentialId(this.prisma, {
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
              anesthesiaType: dto.anesthesiaType, scheduledDate,
              scheduledStart: dto.scheduledStart, expectedDurationMins: dto.expectedDurationMins,
              bloodUnitsReserved: dto.bloodUnitsReserved || 0, notes: dto.notes, status: 'SCHEDULED', createdById,
              ...(dto.preOpChecklist ? { preOpChecklist: dto.preOpChecklist } : {}),
            },
            include: { otRoom: true },
          });
        },
      });
    } catch (err: any) {
      // Surface the underlying reason. Prisma's raw-SQL errors (P2010) have a
      // multi-line message where the first line is the generic
      // "Invalid `prisma.$queryRawUnsafe()` invocation:" boilerplate — the
      // real Postgres error sits a few lines down. Walk all lines and pick
      // the most informative one so the toast actually helps debugging.
      const code = err?.code || '';
      const meta = err?.meta || {};
      const raw = String(err?.message || err);
      const lines = raw.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      const banner = /invalid `.+` invocation/i;
      const pgErrorLine = lines.find((l: string) => /^error[:\s]/i.test(l) || /^message[:\s]/i.test(l) || /^db error/i.test(l));
      const nonBanner = lines.find((l: string) => !banner.test(l));
      const userLine = pgErrorLine || nonBanner || lines[0] || 'Database insert failed';

      this.logger.error(`OT booking insert failed: code=${code} meta=${JSON.stringify(meta)} raw=${JSON.stringify(raw).slice(0, 1500)}`, err);

      // Map common Prisma codes to friendly messages.
      if (code === 'P2003') {
        const field = meta?.field_name || meta?.constraint || 'foreign key';
        throw new BadRequestException(`Invalid reference (${field}). One of patient / surgeon / room / anesthetist / department does not exist in this tenant.`);
      }
      if (code === 'P2002') {
        throw new BadRequestException(`Duplicate value on ${JSON.stringify(meta?.target) || 'a unique field'}.`);
      }
      if (code === 'P2025') {
        throw new BadRequestException(`A required referenced record was not found.`);
      }
      // Generic fallback — always include the code and a chunk of the actual
      // underlying detail (truncated) so the toast is debuggable on its own.
      throw new BadRequestException(`Cannot create booking${code ? ` (Prisma ${code})` : ''}: ${userLine.slice(0, 300)}`);
    }

    // Fire-and-forget booking confirmation emails — never block the create.
    this.sendBookingConfirmationEmails(tenantId, booking).catch((err) =>
      this.logger.error('Failed to send OT booking confirmation email', err as any),
    );

    return booking;
  }

  private async sendBookingConfirmationEmails(tenantId: string, booking: any) {
    const [patient, surgeon, tenant] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: booking.patientId, tenantId }, select: { firstName: true, lastName: true, email: true } }),
      booking.primarySurgeonId
        ? this.prisma.tenantUser.findFirst({ where: { id: booking.primarySurgeonId, tenantId }, select: { firstName: true, lastName: true, email: true } })
        : Promise.resolve(null),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } }),
    ]);
    const orgName = tenant?.tradeName || tenant?.legalName || 'your hospital';
    const surgeonName = surgeon ? `Dr. ${surgeon.firstName} ${surgeon.lastName || ''}`.trim() : 'the surgical team';
    const room = (booking as any).otRoom?.name || 'OT';
    const dateStr = new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const procedure = booking.procedureName || 'Surgical Procedure';

    const wrap = (title: string, intro: string) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${orgName}</h1>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
          <p style="color:#4b5563;line-height:1.6;">${intro}</p>
          <p style="color:#4b5563;font-size:13px;margin-top:12px;">
            <strong>Booking #:</strong> ${booking.bookingNumber}<br/>
            <strong>Procedure:</strong> ${procedure}<br/>
            <strong>Surgeon:</strong> ${surgeonName}<br/>
            <strong>Date:</strong> ${dateStr}<br/>
            <strong>Time:</strong> ${booking.scheduledStart}<br/>
            <strong>Theatre:</strong> ${room}<br/>
            <strong>Expected duration:</strong> ${booking.expectedDurationMins} min<br/>
            <strong>Surgery type:</strong> ${booking.surgeryType}
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">If you need to reschedule or have any questions, please contact our OT desk.</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This is an automated message from ${orgName}. Do not reply.</p>
      </div>`;

    if (patient?.email) {
      sendEmail(patient.email, `Surgery scheduled - ${procedure} - ${orgName}`,
        wrap('Your surgery has been scheduled',
          `Dear ${patient.firstName || ''} ${patient.lastName || ''},<br/><br/>Your ${procedure} has been scheduled at ${orgName}. Please find the details below and follow any pre-operative instructions (fasting, medications, escort) given by our team.`),
      ).catch((err) => this.logger.error(`Failed to email patient about OT booking ${booking.bookingNumber}`, err));
    }
    if (surgeon?.email) {
      sendEmail(surgeon.email, `OT booking confirmed - ${booking.bookingNumber} - ${orgName}`,
        wrap('OT booking confirmed',
          `A new operating theatre booking has been created for your surgical block.`),
      ).catch((err) => this.logger.error(`Failed to email surgeon about OT booking ${booking.bookingNumber}`, err));
    }
  }

  async updateBooking(tenantId: string, id: string, dto: any) {
    const booking = await this.prisma.oTBooking.findFirst({ where: { id, tenantId } });
    if (!booking) throw new NotFoundException('OT Booking not found');

    // If any of the scheduling fields change, re-run the conflict check
    // against the *new* surgeon/patient/room/window.
    const wantsRescheduling = ['scheduledDate', 'scheduledStart', 'expectedDurationMins', 'primarySurgeonId', 'otRoomId']
      .some((k) => dto[k] !== undefined);
    if (wantsRescheduling) {
      const newDate = dto.scheduledDate !== undefined ? new Date(dto.scheduledDate) : booking.scheduledDate;
      const newStart = dto.scheduledStart !== undefined ? dto.scheduledStart : booking.scheduledStart;
      const newDuration = dto.expectedDurationMins !== undefined ? dto.expectedDurationMins : booking.expectedDurationMins;
      const newSurgeon = dto.primarySurgeonId !== undefined ? dto.primarySurgeonId : booking.primarySurgeonId;
      const newRoom = dto.otRoomId !== undefined ? dto.otRoomId : booking.otRoomId;
      const win = this.bookingWindow(newDate, newStart, newDuration);
      if (win) {
        const conflict = await this.findConflict(tenantId, win, newSurgeon, booking.patientId, newRoom, newDate, id);
        if (conflict) {
          const label =
            conflict.kind === 'SURGEON' ? `the primary surgeon is already booked (${conflict.booking.bookingNumber})` :
            conflict.kind === 'PATIENT' ? `the patient already has another OT booking (${conflict.booking.bookingNumber})` :
            `the OT room is already booked (${conflict.booking.bookingNumber})`;
          throw new BadRequestException(`Cannot reschedule booking: ${label} in the requested time window.`);
        }
      }
    }

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
    return this.prisma.oTBooking.update({ where: { id, tenantId }, data });
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

  // ── Anaesthesia Record ──

  async upsertAnaesthesiaRecord(tenantId: string, bookingId: string, dto: any, userId: string) {
    const booking = await this.prisma.oTBooking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('OT Booking not found');
    return this.prisma.anaesthesiaRecord.upsert({
      where: { bookingId },
      update: {
        events: dto.events, inductionTime: dto.inductionTime ? new Date(dto.inductionTime) : undefined,
        inductionMethod: dto.inductionMethod, airwayDevice: dto.airwayDevice, ettSize: dto.ettSize,
        maintenanceAgent: dto.maintenanceAgent, muscleRelaxant: dto.muscleRelaxant,
        reversalTime: dto.reversalTime ? new Date(dto.reversalTime) : undefined,
        reversalAgent: dto.reversalAgent, extubationTime: dto.extubationTime ? new Date(dto.extubationTime) : undefined,
        vitalSnapshots: dto.vitalSnapshots, totalIVFluids: dto.totalIVFluids,
        totalBloodProducts: dto.totalBloodProducts, urineOutput: dto.urineOutput,
        recoveryScore: dto.recoveryScore, recoveryNotes: dto.recoveryNotes,
      },
      create: {
        tenantId, bookingId, patientId: booking.patientId, anesthetistId: userId,
        events: dto.events, inductionTime: dto.inductionTime ? new Date(dto.inductionTime) : null,
        inductionMethod: dto.inductionMethod, airwayDevice: dto.airwayDevice, ettSize: dto.ettSize,
        maintenanceAgent: dto.maintenanceAgent, muscleRelaxant: dto.muscleRelaxant,
        reversalTime: dto.reversalTime ? new Date(dto.reversalTime) : null,
        reversalAgent: dto.reversalAgent, extubationTime: dto.extubationTime ? new Date(dto.extubationTime) : null,
        vitalSnapshots: dto.vitalSnapshots, totalIVFluids: dto.totalIVFluids,
        totalBloodProducts: dto.totalBloodProducts, urineOutput: dto.urineOutput,
        recoveryScore: dto.recoveryScore, recoveryNotes: dto.recoveryNotes,
      },
    });
  }

  async getAnaesthesiaRecord(tenantId: string, bookingId: string) {
    return this.prisma.anaesthesiaRecord.findUnique({ where: { bookingId } }) || null;
  }

  // ── Pre-Op Assessment ──

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
    const updated = await this.prisma.oTBooking.update({ where: { id, tenantId }, data: { status: 'IN_PROGRESS', actualStart: new Date() } });
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
    const updated = await this.prisma.oTBooking.update({ where: { id, tenantId }, data });
    this.ws.emitToTenant(tenantId, 'ot:status:changed', { action: 'completed', booking: updated });

    // Itemised auto-billing — one line item per cost component. Each uses a
    // distinct referenceId derived from the booking id, so addChargeToOpenVisit's
    // per-referenceId idempotency guard prevents double-billing on retry.
    // All sends are fire-and-forget so a billing hiccup never blocks completion.
    this.autoBillOTCompletion(tenantId, updated).catch((err) =>
      this.logger.error(`Failed to auto-bill OT booking ${booking.bookingNumber}`, err),
    );

    // If this surgery is linked to an IPD admission, pre-fill the discharge
    // summary with the procedure details. Skipped when no admissionId is set
    // (day-care / OPD surgery) — DischargeSummary has admissionId as NOT NULL.
    this.prepareDischargeSummaryFromOT(tenantId, updated).catch((err) =>
      this.logger.error(`Failed to prepare discharge summary for ${booking.bookingNumber}`, err),
    );

    // Draft a post-op prescription template (analgesic + antibiotic if the
    // procedure was contaminated/dirty class). Doctor edits/signs before
    // sending to pharmacy.
    this.createPostOpPrescriptionDraft(tenantId, updated).catch((err) =>
      this.logger.error(`Failed to draft post-op prescription for ${booking.bookingNumber}`, err),
    );

    // Auto-order a routine post-op CBC (6h post-op) so nursing has the
    // bloodwork queued. Doctor can cancel via the lab module if not needed.
    this.createPostOpLabOrder(tenantId, updated).catch((err) =>
      this.logger.error(`Failed to draft post-op lab order for ${booking.bookingNumber}`, err),
    );

    return updated;
  }

  // Idempotent post-op prescription draft. We tag the notes with the booking
  // id so re-running complete (or completing multiple times during testing)
  // never duplicates the script. The doctor sees a PENDING prescription on
  // their dashboard and can edit before clicking "Send to Pharmacy".
  private async createPostOpPrescriptionDraft(tenantId: string, booking: any): Promise<void> {
    if (!booking.primarySurgeonId) return;
    const marker = `[ot:${booking.id}]`;
    const existing = await this.prisma.prescription.findFirst({
      where: { tenantId, patientId: booking.patientId, notes: { contains: marker } },
      select: { id: true },
    });
    if (existing) return;

    // Infection risk class is stashed in preOpChecklist JSON (no dedicated column).
    const checklist = (booking.preOpChecklist || {}) as any;
    const riskClass = checklist?.infectionRiskClass || '';
    const needsAntibiotic = riskClass === 'CONTAMINATED' || riskClass === 'DIRTY';

    const items: any[] = [
      // Pain management — standard for any surgery.
      { drugName: 'Paracetamol', strength: '500 mg', dosageForm: 'TABLET', dosage: '1 tab', frequency: 'QID', durationDays: 5, route: 'ORAL', instructions: 'After food. Maximum 4 g/day.', quantity: 20, refillsAllowed: 0, isControlled: false, status: 'PENDING', sortOrder: 0 },
      { drugName: 'Diclofenac', strength: '50 mg', dosageForm: 'TABLET', dosage: '1 tab', frequency: 'BD', durationDays: 3, route: 'ORAL', instructions: 'After food. Stop if gastritis.', quantity: 6, refillsAllowed: 0, isControlled: false, status: 'PENDING', sortOrder: 1 },
      // PPI cover.
      { drugName: 'Pantoprazole', strength: '40 mg', dosageForm: 'TABLET', dosage: '1 tab', frequency: 'OD', durationDays: 5, route: 'ORAL', instructions: 'Before breakfast.', quantity: 5, refillsAllowed: 0, isControlled: false, status: 'PENDING', sortOrder: 2 },
    ];
    if (needsAntibiotic) {
      items.push({ drugName: 'Amoxicillin + Clavulanic Acid', strength: '625 mg', dosageForm: 'TABLET', dosage: '1 tab', frequency: 'TDS', durationDays: 5, route: 'ORAL', instructions: 'After food. Complete the full course.', quantity: 15, refillsAllowed: 0, isControlled: false, status: 'PENDING', sortOrder: 3 });
    }

    const validity = new Date(); validity.setDate(validity.getDate() + 30);
    const rxNumber = `RX-${Date.now()}-OT-${booking.bookingNumber.split('-').pop()}`;
    try {
      await this.prisma.prescription.create({
        data: {
          tenantId,
          rxNumber,
          locationId: booking.locationId,
          patientId: booking.patientId,
          doctorId: booking.primarySurgeonId,
          validityDate: validity,
          notes: `Post-op draft for ${booking.procedureName} ${marker}. Review & sign before sending to pharmacy.`,
          status: 'PENDING',
          items: { create: items },
        },
      });
    } catch (err) {
      this.logger.error(`Could not create post-op Rx draft for ${booking.bookingNumber}`, err as any);
    }
  }

  // Idempotent post-op lab order: routine CBC ~6h post-op. Tagged with the
  // booking id in clinicalNotes so retry never duplicates.
  private async createPostOpLabOrder(tenantId: string, booking: any): Promise<void> {
    if (!booking.primarySurgeonId) return;
    const marker = `[ot:${booking.id}]`;
    const existing = await this.prisma.labOrder.findFirst({
      where: { tenantId, patientId: booking.patientId, clinicalNotes: { contains: marker } },
      select: { id: true },
    });
    if (existing) return;

    const orderNumber = `LAB-${Date.now()}-OT-${booking.bookingNumber.split('-').pop()}`;
    try {
      await this.prisma.labOrder.create({
        data: {
          tenantId,
          orderNumber,
          locationId: booking.locationId,
          patientId: booking.patientId,
          doctorId: booking.primarySurgeonId,
          priority: 'ROUTINE',
          status: 'ORDERED',
          clinicalNotes: `Post-op CBC for ${booking.procedureName} ${marker}. Draw at 6h post-op.`,
          items: {
            create: [
              { testCode: 'CBC',    testName: 'Complete Blood Count',  category: 'HAEMATOLOGY', urgency: 'ROUTINE', status: 'PENDING' },
              { testCode: 'CRP',    testName: 'C-Reactive Protein',    category: 'BIOCHEMISTRY', urgency: 'ROUTINE', status: 'PENDING' },
            ],
          },
        },
      });
    } catch (err) {
      this.logger.error(`Could not create post-op lab order for ${booking.bookingNumber}`, err as any);
    }
  }

  // Best-effort: pre-fill a DRAFT discharge summary for an IPD admission so
  // the discharging doctor only needs to add recovery instructions + follow-up.
  // Idempotent via the unique (tenantId, admissionId) index — uses upsert so
  // calling complete twice (or coming from a partially-filled draft already
  // created by the admission flow) merges procedure info without overwriting
  // doctor-entered fields.
  private async prepareDischargeSummaryFromOT(tenantId: string, booking: any): Promise<void> {
    if (!booking.admissionId) return;

    const admission = await this.prisma.admission.findFirst({
      where: { id: booking.admissionId, tenantId },
      select: { admissionDate: true, locationId: true, admittingDoctorId: true, diagnosisOnAdmission: true },
    });
    if (!admission) return;

    const procedureLine = `${booking.procedureName} (${booking.bookingNumber}) on ${new Date(booking.actualEnd || booking.scheduledDate).toLocaleDateString('en-IN')}`;
    const treatmentBlock = [
      `Procedure: ${booking.procedureName}`,
      `OT Booking #: ${booking.bookingNumber}`,
      booking.intraOpNotes ? `Intra-op: ${booking.intraOpNotes}` : null,
      booking.postOpNotes ? `Post-op: ${booking.postOpNotes}` : null,
      booking.complications ? `Complications: ${booking.complications}` : null,
    ].filter(Boolean).join('\n');

    const existing = await this.prisma.dischargeSummary.findUnique({
      where: { tenantId_admissionId: { tenantId, admissionId: booking.admissionId } },
    });

    if (existing) {
      // Don't trample doctor-entered fields. Only update when destination is
      // empty or when we have richer data to merge. Append rather than replace
      // the procedures array.
      const existingProcs: any[] = Array.isArray(existing.proceduresPerformed) ? existing.proceduresPerformed as any[] : [];
      const alreadyHasProcedure = existingProcs.some((p: any) => p?.bookingId === booking.id);
      const newProcs = alreadyHasProcedure
        ? existingProcs
        : [...existingProcs, { bookingId: booking.id, bookingNumber: booking.bookingNumber, procedureName: booking.procedureName, date: booking.actualEnd || booking.scheduledDate }];
      await this.prisma.dischargeSummary.update({
        where: { id: existing.id },
        data: {
          proceduresPerformed: newProcs,
          // Only fill blanks; never overwrite text the doctor typed.
          treatmentGiven: existing.treatmentGiven && existing.treatmentGiven.trim() ? existing.treatmentGiven : treatmentBlock,
        },
      });
      return;
    }

    await this.prisma.dischargeSummary.create({
      data: {
        tenantId,
        locationId: admission.locationId,
        admissionId: booking.admissionId,
        patientId: booking.patientId,
        doctorId: booking.primarySurgeonId || admission.admittingDoctorId,
        admissionDate: admission.admissionDate,
        diagnosisOnAdmission: admission.diagnosisOnAdmission || procedureLine,
        proceduresPerformed: [{ bookingId: booking.id, bookingNumber: booking.bookingNumber, procedureName: booking.procedureName, date: booking.actualEnd || booking.scheduledDate }],
        treatmentGiven: treatmentBlock,
        status: 'DRAFT',
      },
    });
  }

  // Build line items for a completed OT booking. Defaults are sensible
  // placeholders — reception/billing can edit before finalising. Future
  // enhancement: pull surgeon/anesthetist fees from per-doctor config and
  // procedure fee from a ProcedureCatalog table.
  private async autoBillOTCompletion(tenantId: string, booking: any): Promise<void> {
    const PROCEDURE_FEE = 5000;     // surgeon-independent base fee
    const SURGEON_FEE = 4000;       // primary surgeon professional fee
    const ANESTHETIST_FEE = 2500;   // anaesthetist professional fee
    const FACILITY_RATE_PER_MIN = 25; // OT room time charge (₹25/min)

    // Use actual duration if available, else fall back to expected.
    let mins = booking.expectedDurationMins || 60;
    if (booking.actualStart && booking.actualEnd) {
      mins = Math.max(15, Math.round((booking.actualEnd.getTime() - booking.actualStart.getTime()) / 60000));
    }
    const facilityCharge = mins * FACILITY_RATE_PER_MIN;

    const lineItems: Array<{ description: string; category: string; quantity: number; unitPrice: number; referenceId: string }> = [
      {
        description: `OT Procedure — ${booking.procedureName} (${booking.bookingNumber})`,
        category: 'PROCEDURE',
        quantity: 1,
        unitPrice: PROCEDURE_FEE,
        referenceId: booking.id, // unchanged from previous behavior — preserves idempotency for already-completed bookings
      },
      {
        description: `Surgeon Professional Fee (${booking.bookingNumber})`,
        category: 'PROCEDURE',
        quantity: 1,
        unitPrice: SURGEON_FEE,
        referenceId: `${booking.id}-surgeon`,
      },
      {
        description: `OT Facility Charge — ${mins} min @ ₹${FACILITY_RATE_PER_MIN}/min (${booking.bookingNumber})`,
        category: 'PROCEDURE',
        quantity: 1,
        unitPrice: facilityCharge,
        referenceId: `${booking.id}-facility`,
      },
    ];
    if (booking.anesthetistId) {
      lineItems.push({
        description: `Anaesthetist Professional Fee (${booking.bookingNumber})`,
        category: 'PROCEDURE',
        quantity: 1,
        unitPrice: ANESTHETIST_FEE,
        referenceId: `${booking.id}-anesthetist`,
      });
    }

    for (const item of lineItems) {
      try {
        await this.billing.addChargeToOpenVisit(
          tenantId,
          booking.patientId,
          item,
          { locationId: booking.locationId, doctorId: booking.primarySurgeonId, consultationId: undefined },
        );
      } catch (err) {
        this.logger.error(`Failed to bill OT line "${item.description}" for ${booking.bookingNumber}`, err as any);
      }
    }
  }
}
