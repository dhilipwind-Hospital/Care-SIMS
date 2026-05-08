import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(tenantId: string, query: string) {
    if (!query || query.trim().length < 2) {
      return { patients: [], appointments: [], queue: [], invoices: [], prescriptions: [], admissions: [], labOrders: [] };
    }

    const q = query.trim();

    const patientMatch = {
      OR: [
        { patient: { firstName: { contains: q, mode: 'insensitive' as const } } },
        { patient: { lastName:  { contains: q, mode: 'insensitive' as const } } },
        { patient: { patientId: { contains: q, mode: 'insensitive' as const } } },
      ],
    };

    const [patients, appointments, queue, invoices, prescriptions, admissions, labOrders] = await Promise.all([
      this.prisma.patient.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { patientId: { contains: q, mode: 'insensitive' } },
            { mobile:    { contains: q } },
          ],
        },
        select: { id: true, patientId: true, firstName: true, lastName: true, mobile: true, gender: true, ageYears: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.appointment.findMany({
        where: { tenantId, ...patientMatch },
        select: {
          id: true, appointmentDate: true, status: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { appointmentDate: 'desc' },
      }),

      this.prisma.queueToken.findMany({
        where: { tenantId, ...patientMatch },
        select: {
          id: true, tokenNumber: true, status: true, queueDate: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.invoice.findMany({
        where: {
          tenantId,
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            ...patientMatch.OR,
          ],
        },
        select: {
          id: true, invoiceNumber: true, netTotal: true, status: true, createdAt: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.prescription.findMany({
        where: {
          tenantId,
          OR: [
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName:  { contains: q, mode: 'insensitive' } } },
            { patient: { patientId: { contains: q, mode: 'insensitive' } } },
            { items: { some: { drugName: { contains: q, mode: 'insensitive' } } } },
          ],
        },
        select: {
          id: true, rxNumber: true, createdAt: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
          items: { select: { drugName: true }, take: 1 },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.admission.findMany({
        where: { tenantId, ...patientMatch },
        select: {
          id: true, admissionNumber: true, admissionDate: true, status: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { admissionDate: 'desc' },
      }),

      this.prisma.labOrder.findMany({
        where: {
          tenantId,
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            ...patientMatch.OR,
          ],
        },
        select: {
          id: true, orderNumber: true, status: true, orderedAt: true,
          patient: { select: { patientId: true, firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { orderedAt: 'desc' },
      }),
    ]);

    return { patients, appointments, queue, invoices, prescriptions, admissions, labOrders };
  }
}
