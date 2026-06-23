import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

// Same shell as admissions/discharge-summary — kept inline to avoid a shared
// dependency.
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
export class AmbulanceService {
  private readonly logger = new Logger(AmbulanceService.name);
  constructor(private prisma: PrismaService) {}

  async listVehicles(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.ambulance.findMany({ where, orderBy: { vehicleNumber: 'asc' } });
  }

  async addVehicle(tenantId: string, dto: any) {
    return this.prisma.ambulance.create({
      data: {
        tenantId, locationId: dto.locationId, vehicleNumber: dto.vehicleNumber,
        vehicleType: dto.vehicleType, equipmentLevel: dto.equipmentLevel || 'BLS',
        driverName: dto.driverName, driverPhone: dto.driverPhone,
        paramedicName: dto.paramedicName, paramedicPhone: dto.paramedicPhone,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : undefined,
      },
    });
  }

  async updateVehicle(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const v = await tx.ambulance.findFirst({ where: { id, tenantId } });
      if (!v) throw new NotFoundException('Vehicle not found');
      const data: any = {};
      if (dto.vehicleNumber !== undefined) data.vehicleNumber = dto.vehicleNumber;
      if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType;
      if (dto.equipmentLevel !== undefined) data.equipmentLevel = dto.equipmentLevel;
      if (dto.driverName !== undefined) data.driverName = dto.driverName;
      if (dto.driverPhone !== undefined) data.driverPhone = dto.driverPhone;
      if (dto.paramedicName !== undefined) data.paramedicName = dto.paramedicName;
      if (dto.paramedicPhone !== undefined) data.paramedicPhone = dto.paramedicPhone;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.insuranceExpiry !== undefined) data.insuranceExpiry = dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null;
      if (dto.fitnessExpiry !== undefined) data.fitnessExpiry = dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : null;
      return tx.ambulance.update({ where: { id, tenantId }, data });
    });
  }

  async listTrips(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.ambulanceTrip.findMany({ where, include: { ambulance: true }, orderBy: { dispatchTime: 'desc' } });
  }

  async dispatch(tenantId: string, userId: string, dto: any) {
    const trip = await generateSequentialId(this.prisma, {
      table: 'AmbulanceTrip',
      idColumn: 'tripNumber',
      prefix: 'AMB-',
      tenantId,
      callback: async (tx, tripNumber) => {
        const v = await tx.ambulance.findFirst({ where: { id: dto.ambulanceId, tenantId } });
        if (!v) throw new NotFoundException('Vehicle not found');
        await tx.ambulance.update({ where: { id: dto.ambulanceId, tenantId }, data: { status: 'ON_TRIP' } });
        return tx.ambulanceTrip.create({
          data: {
            tenantId, tripNumber,
            ambulanceId: dto.ambulanceId, patientId: dto.patientId,
            patientName: dto.patientName, patientPhone: dto.patientPhone,
            tripType: dto.tripType, pickupAddress: dto.pickupAddress, dropAddress: dto.dropAddress,
            dispatchedById: userId, odometerStart: dto.odometerStart,
          },
        });
      },
    });

    // Fire-and-forget patient/family confirmation email with driver + vehicle
    // details so they know who is en route. Never blocks the dispatch response.
    this.sendAmbulanceDispatchEmails(tenantId, trip.id).catch((err) => {
      this.logger.error(`Ambulance dispatch email failed: ${err?.message || err}`);
    });

    return trip;
  }

  // Compose + send patient confirmation email with driver/vehicle/ETA info. Non-blocking.
  private async sendAmbulanceDispatchEmails(tenantId: string, tripId: string): Promise<void> {
    const trip = await this.prisma.ambulanceTrip.findFirst({
      where: { id: tripId, tenantId },
      include: { ambulance: true },
    });
    if (!trip) return;

    const [patient, tenant] = await Promise.all([
      trip.patientId
        ? this.prisma.patient.findUnique({
            where: { id: trip.patientId },
            select: { firstName: true, lastName: true, patientId: true, email: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tradeName: true, legalName: true },
      }),
    ]);

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const patientName =
      `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() ||
      trip.patientName ||
      '(patient)';
    const ambulance = trip.ambulance;

    // Skip if there is no email destination — patient has no email on file.
    if (!patient?.email) return;

    const detailRows: string[] = [];
    if (ambulance?.driverName)    detailRows.push(`<li><strong>Driver:</strong> ${ambulance.driverName}${ambulance.driverPhone ? ` (${ambulance.driverPhone})` : ''}</li>`);
    if (ambulance?.vehicleNumber) detailRows.push(`<li><strong>Vehicle:</strong> ${ambulance.vehicleNumber}${ambulance.vehicleType ? ` — ${ambulance.vehicleType}` : ''}</li>`);
    if (ambulance?.equipmentLevel) detailRows.push(`<li><strong>Equipment level:</strong> ${ambulance.equipmentLevel}</li>`);
    if (trip.pickupAddress)       detailRows.push(`<li><strong>Pickup address:</strong> ${trip.pickupAddress}</li>`);
    if (trip.dropAddress)         detailRows.push(`<li><strong>Drop address:</strong> ${trip.dropAddress}</li>`);
    if (trip.tripType)            detailRows.push(`<li><strong>Trip type:</strong> ${trip.tripType}</li>`);
    if (ambulance?.paramedicName) detailRows.push(`<li><strong>Paramedic:</strong> ${ambulance.paramedicName}${ambulance.paramedicPhone ? ` (${ambulance.paramedicPhone})` : ''}</li>`);
    const detailsBlock = detailRows.length
      ? `<ul style="line-height:1.7;">${detailRows.join('')}</ul>`
      : '';

    const subject = `🚑 Ambulance Dispatched — ${patientName} — ${orgName}`;
    const body = `Dear ${patient.firstName || patientName},<br/><br/>
An ambulance has been dispatched for you (trip <strong>${trip.tripNumber}</strong>). The driver is on the way to the pickup address.<br/><br/>
${detailsBlock}
<br/>The driver will call you on arrival. Please keep your phone reachable. If your condition worsens before arrival, call our emergency line immediately.`;

    sendEmail(patient.email, subject, emailTemplate('Ambulance Dispatched', body, orgName))
      .catch((err) => this.logger.error(`Ambulance patient confirm email failed: ${err?.message || err}`));
  }

  async getTrip(tenantId: string, id: string) {
    const t = await this.prisma.ambulanceTrip.findFirst({ where: { id, tenantId }, include: { ambulance: true } });
    if (!t) throw new NotFoundException('Trip not found');
    return t;
  }

  async arrive(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.ambulanceTrip.findFirst({ where: { id, tenantId }, include: { ambulance: true } });
      if (!t) throw new NotFoundException('Trip not found');
      return tx.ambulanceTrip.update({ where: { id, tenantId }, data: { arrivalTime: new Date(), status: 'ARRIVED' } });
    });
  }

  async depart(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.ambulanceTrip.findFirst({ where: { id, tenantId }, include: { ambulance: true } });
      if (!t) throw new NotFoundException('Trip not found');
      return tx.ambulanceTrip.update({ where: { id, tenantId }, data: { departureTime: new Date(), status: 'EN_ROUTE' } });
    });
  }

  async complete(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.ambulanceTrip.findFirst({ where: { id, tenantId }, include: { ambulance: true } });
      if (!trip) throw new NotFoundException('Trip not found');
      await tx.ambulance.update({ where: { id: trip.ambulanceId }, data: { status: 'AVAILABLE' } });
      return tx.ambulanceTrip.update({
        where: { id, tenantId },
        data: { completedTime: new Date(), status: 'COMPLETED', odometerEnd: dto.odometerEnd, distanceKm: dto.distanceKm, condition: dto.condition, vitalsEnRoute: dto.vitalsEnRoute, treatmentGiven: dto.treatmentGiven, notes: dto.notes },
      });
    });
  }
}
