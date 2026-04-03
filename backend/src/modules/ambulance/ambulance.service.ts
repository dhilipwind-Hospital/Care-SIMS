import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class AmbulanceService {
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
      return tx.ambulance.update({ where: { id }, data });
    });
  }

  async listTrips(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.ambulanceTrip.findMany({ where, include: { ambulance: true }, orderBy: { dispatchTime: 'desc' } });
  }

  async dispatch(tenantId: string, userId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'AmbulanceTrip',
      idColumn: 'tripNumber',
      prefix: 'AMB-',
      tenantId,
      callback: async (tx, tripNumber) => {
        const v = await tx.ambulance.findFirst({ where: { id: dto.ambulanceId, tenantId } });
        if (!v) throw new NotFoundException('Vehicle not found');
        await tx.ambulance.update({ where: { id: dto.ambulanceId }, data: { status: 'ON_TRIP' } });
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
      return tx.ambulanceTrip.update({ where: { id }, data: { arrivalTime: new Date(), status: 'ARRIVED' } });
    });
  }

  async depart(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.ambulanceTrip.findFirst({ where: { id, tenantId }, include: { ambulance: true } });
      if (!t) throw new NotFoundException('Trip not found');
      return tx.ambulanceTrip.update({ where: { id }, data: { departureTime: new Date(), status: 'EN_ROUTE' } });
    });
  }

  async complete(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.ambulanceTrip.findFirst({ where: { id, tenantId }, include: { ambulance: true } });
      if (!trip) throw new NotFoundException('Trip not found');
      await tx.ambulance.update({ where: { id: trip.ambulanceId }, data: { status: 'AVAILABLE' } });
      return tx.ambulanceTrip.update({
        where: { id },
        data: { completedTime: new Date(), status: 'COMPLETED', odometerEnd: dto.odometerEnd, distanceKm: dto.distanceKm, condition: dto.condition, vitalsEnRoute: dto.vitalsEnRoute, treatmentGiven: dto.treatmentGiven, notes: dto.notes },
      });
    });
  }
}
