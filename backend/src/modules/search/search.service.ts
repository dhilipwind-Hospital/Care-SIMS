import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(tenantId: string, query: string) {
    if (!query || query.trim().length < 2) {
      return { patients: [], appointments: [], queue: [] };
    }

    const q = query.trim();

    const [patients, appointments, queue] = await Promise.all([
      this.prisma.patient.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { patientId: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
          ],
        },
        select: {
          id: true, patientId: true, firstName: true, lastName: true,
          mobile: true, gender: true, ageYears: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.appointment.findMany({
        where: {
          tenantId,
          OR: [
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
            { patient: { patientId: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true, appointmentDate: true, status: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { appointmentDate: 'desc' },
      }),

      this.prisma.queueToken.findMany({
        where: {
          tenantId,
          OR: [
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
            { patient: { patientId: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true, tokenNumber: true, status: true, queueDate: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { patients, appointments, queue };
  }
}
