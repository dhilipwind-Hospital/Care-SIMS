import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {}

  getFileUrl(filename: string, type: 'profiles' | 'documents'): string {
    return `/uploads/${type}/${filename}`;
  }

  async updateUserPhoto(tenantId: string, userId: string, photoUrl: string) {
    return this.prisma.tenantUser.update({
      where: { id: userId },
      data: { photoUrl },
    });
  }

  async updatePatientPhoto(tenantId: string, patientId: string, photoUrl: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.prisma.patient.update({
      where: { id: patientId },
      data: { photoUrl },
    });
  }

  validateFileExists(filename: string, type: 'profiles' | 'documents'): boolean {
    const filePath = join(process.cwd(), 'uploads', type, filename);
    return existsSync(filePath);
  }
}
