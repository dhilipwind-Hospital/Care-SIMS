import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string, orgName?: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">${orgName || 'Ayphen HMS'}</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from ${orgName || 'Ayphen HMS'}. Do not reply.
  </p>
</div>`;
}

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
    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({ where, skip, take: Number(limit), orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }], include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } } }),
      this.prisma.appointment.count({ where }),
    ]);
    const data = await this.withDoctorAndDepartment(tenantId, rows);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  // Appointment has no `doctor`/`department` relation — doctorId is a bare
  // string that may point at either a TenantUser (in-house staff) or a
  // DoctorRegistry row (affiliated doctor), and departmentId is usually null
  // because reception books by doctor, not department. Resolve both here so
  // the list screen has names to render, and expose the field aliases the
  // frontend reads (slotTime / appointmentType / appointmentNumber).
  // Same resolution shape as OT's getBookings surgeon lookup.
  private async withDoctorAndDepartment(tenantId: string, rows: any[]) {
    if (!rows.length) return rows;

    const doctorIds = [...new Set(rows.map(r => r.doctorId).filter(Boolean))];
    const departmentIds = [...new Set(rows.map(r => r.departmentId).filter(Boolean))];

    const [users, registry, affiliations, departments] = await Promise.all([
      doctorIds.length
        ? this.prisma.tenantUser.findMany({ where: { id: { in: doctorIds }, tenantId }, select: { id: true, firstName: true, lastName: true } })
        : [],
      doctorIds.length
        ? this.prisma.doctorRegistry.findMany({ where: { id: { in: doctorIds } }, select: { id: true, firstName: true, lastName: true, pgSpecialization: true } })
        : [],
      doctorIds.length
        ? this.prisma.doctorOrgAffiliation.findMany({ where: { tenantId, doctorId: { in: doctorIds } }, select: { doctorId: true, departmentName: true } })
        : [],
      departmentIds.length
        ? this.prisma.department.findMany({ where: { id: { in: departmentIds }, tenantId }, select: { id: true, name: true } })
        : [],
    ]);

    // TenantUser wins over DoctorRegistry when an id somehow matches both.
    const doctorMap = new Map<string, any>([...registry, ...users].map(d => [d.id, d]));
    const affMap = new Map<string, string | null>(affiliations.map(a => [a.doctorId, a.departmentName] as [string, string | null]));
    const deptMap = new Map<string, string>(departments.map(d => [d.id, d.name] as [string, string]));

    return rows.map(r => {
      const doc = r.doctorId ? doctorMap.get(r.doctorId) : null;
      // Department: explicit link first, then the doctor's affiliation
      // department, then their PG specialisation as a last resort.
      const deptName =
        (r.departmentId && deptMap.get(r.departmentId)) ||
        affMap.get(r.doctorId) ||
        doc?.pgSpecialization ||
        null;
      return {
        ...r,
        doctor: doc ? { id: doc.id, firstName: doc.firstName, lastName: doc.lastName } : null,
        department: deptName ? { id: r.departmentId || null, name: deptName } : null,
        specialization: doc?.pgSpecialization || null,
        slotTime: r.appointmentTime,
        appointmentType: r.type,
        appointmentNumber: `APT-${String(r.id).slice(0, 8).toUpperCase()}`,
      };
    });
  }

  async create(tenantId: string, dto: any, createdById: string) {
    // Auto-resolve locationId. createdById is the JWT sub — for tenant staff
    // it's a TenantUser id, for doctors it's a DoctorRegistry id (no
    // tenantUser row exists). Try staff first, then patient's home location,
    // then any active tenant location. locationId is NOT NULL in the schema.
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: createdById }, select: { primaryLocationId: true } }).catch(() => null);
      locationId = user?.primaryLocationId;
    }
    if (!locationId && dto.patientId) {
      const pat = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId }, select: { locationId: true } });
      locationId = pat?.locationId;
    }
    if (!locationId) {
      const loc = await this.prisma.tenantLocation.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
      locationId = loc?.id;
    }
    if (!locationId) throw new BadRequestException('No active location for this organization');
    // Doctors log in with DoctorRegistry id as JWT sub — but Appointment.createdById
    // FK points to TenantUser. Set to null when no matching staff row.
    const staffCreator = await this.prisma.tenantUser.findUnique({ where: { id: createdById }, select: { id: true } }).catch(() => null);
    const safeCreatedById = staffCreator?.id || null;
    let appointment;
    try {
      appointment = await this.prisma.$transaction(async (tx) => {
        const conflict = await tx.appointment.findFirst({ where: { tenantId, doctorId: dto.doctorId, appointmentDate: new Date(dto.appointmentDate), appointmentTime: dto.appointmentTime || dto.slotTime, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } });
        if (conflict) throw new BadRequestException('Doctor already has an appointment at this time slot');
        return tx.appointment.create({
          data: { tenantId, locationId, patientId: dto.patientId, doctorId: dto.doctorId, departmentId: dto.departmentId, appointmentDate: new Date(dto.appointmentDate), appointmentTime: dto.appointmentTime || dto.slotTime, durationMinutes: dto.durationMinutes || 15, type: dto.type || dto.appointmentType || 'NEW', source: dto.source || 'RECEPTION', chiefComplaint: dto.chiefComplaint, notes: dto.notes, status: 'SCHEDULED', createdById: safeCreatedById },
          include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } },
        });
      });
    } catch (err: any) {
      // appointments_active_slot_uniq (partial unique DB index) closes the
      // check-then-create race the findFirst above can't.
      if (err?.code === 'P2002') throw new BadRequestException('Doctor already has an appointment at this time slot');
      throw err;
    }

    // Non-blocking email notification to patient
    Promise.all([
      this.prisma.patient.findUnique({ where: { id: dto.patientId }, select: { email: true, firstName: true, lastName: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } }),
    ]).then(([patient, tenant]) => {
        if (patient?.email) {
          const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
          const apptDate = new Date(dto.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const apptTime = dto.appointmentTime || dto.slotTime;
          sendEmail(
            patient.email,
            `Appointment Confirmed - ${orgName}`,
            emailTemplate('Appointment Confirmed', `Dear ${patient.firstName} ${patient.lastName},<br><br>Your appointment at <strong>${orgName}</strong> has been confirmed with the following details:<br><br><strong>Date:</strong> ${apptDate}<br><strong>Time:</strong> ${apptTime}<br><strong>Type:</strong> ${dto.type || dto.appointmentType || 'NEW'}<br><br>Please arrive 15 minutes before your scheduled time. If you need to reschedule or cancel, please contact us.`, orgName),
          ).catch((err) => console.error('Failed to send appointment confirmation email:', err));
        }
      })
      .catch((err) => console.error('Failed to look up patient for appointment email:', err));

    return appointment;
  }

  async findOne(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId }, include: { patient: true } });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async update(tenantId: string, id: string, dto: any) {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (err: any) {
      // Reschedule-into-occupied-slot: update has no conflict pre-check, so the
      // appointments_active_slot_uniq index is the guard — surface it as a 400.
      if (err?.code === 'P2002') throw new BadRequestException('Doctor already has an appointment at this time slot');
      throw err;
    }
  }

  async cancel(tenantId: string, id: string, reason: string, cancelledById: string) {
    return this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({ where: { id, tenantId } });
      if (!appt) throw new NotFoundException('Appointment not found');
      return tx.appointment.update({ where: { id }, data: { status: 'CANCELLED', cancellationReason: reason, cancelledById, cancelledAt: new Date() } });
    });
  }

  async getDoctorSlots(tenantId: string, doctorId: string, date: string, locationId: string) {
    // A doctor's affiliation is matched by:
    //   • primary location (locationId), OR
    //   • MULTI scope + locationId listed in allowedLocations, OR
    //   • no locationId requested (let the caller default to the primary)
    const whereBase: any = { tenantId, doctorId, isActive: true };
    const aff = await this.prisma.doctorOrgAffiliation.findFirst({
      where: locationId
        ? {
            ...whereBase,
            OR: [
              { locationId },
              { locationScope: 'MULTI', allowedLocations: { has: locationId } },
            ],
          }
        : whereBase,
      include: { schedules: true },
    });
    if (!aff) throw new NotFoundException('Doctor affiliation not found');
    const target = new Date(date);
    // 0=Sun..6=Sat in JS. Map to schedule's MON..SUN strings.
    const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayKey = dayMap[target.getDay()];

    // Leave check — any leave whose range covers this date hides everything.
    const onLeave = await this.prisma.doctorLeave.findFirst({
      where: {
        affiliationId: aff.id,
        tenantId,
        startDate: { lte: target },
        endDate: { gte: target },
      },
      select: { id: true, reason: true, leaveType: true },
    });
    if (onLeave) return { slots: [], onLeave: true, leaveReason: onLeave.reason || onLeave.leaveType };

    // Find the schedule row for this weekday. If no row, fall back to the
    // legacy availableDays + 09:00–18:00 window so older orgs keep working.
    const sched = (aff.schedules || []).find((s: any) => s.dayOfWeek === dayKey && s.isActive);
    let startTime = '09:00';
    let endTime = '18:00';
    let breakStart: string | null = null;
    let breakEnd: string | null = null;
    let slotMins = aff.slotDurationMinutes || 15;
    if (sched) {
      startTime = sched.startTime;
      endTime = sched.endTime;
      breakStart = sched.breakStart;
      breakEnd = sched.breakEnd;
      slotMins = sched.slotDurationMinutes || slotMins;
    } else if (!(aff.availableDays || []).includes(dayKey)) {
      // No schedule row AND legacy availableDays excludes this day.
      return { slots: [], onLeave: false };
    }

    const booked = await this.prisma.appointment.findMany({
      where: { tenantId, doctorId, appointmentDate: target, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      select: { appointmentTime: true },
    });
    const bookedTimes = new Set(booked.map(a => a.appointmentTime));
    const slots = this.generateTimeSlots(startTime, endTime, slotMins);
    const result = slots.map(slot => {
      const inBreak = breakStart && breakEnd && slot >= breakStart && slot < breakEnd;
      return {
        time: slot,
        available: !bookedTimes.has(slot) && !inBreak,
        reason: inBreak ? 'BREAK' : (bookedTimes.has(slot) ? 'BOOKED' : undefined),
      };
    });
    return { slots: result, onLeave: false, hours: { startTime, endTime, breakStart, breakEnd, slotMins } };
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
