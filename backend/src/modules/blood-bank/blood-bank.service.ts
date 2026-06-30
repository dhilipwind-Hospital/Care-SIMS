import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

// Same shell as triage/vitals — kept inline to avoid a shared dependency.
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
export class BloodBankService {
  private readonly logger = new Logger(BloodBankService.name);
  constructor(private prisma: PrismaService) {}

  async listDonors(tenantId: string, bloodGroup?: string) {
    const where: any = { tenantId };
    if (bloodGroup) where.bloodGroup = bloodGroup;
    return this.prisma.bloodDonor.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  async addDonor(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'BloodDonor',
      idColumn: 'donorId',
      prefix: 'DNR-',
      tenantId,
      callback: async (tx, donorId) => {
        return tx.bloodDonor.create({ data: { tenantId, locationId: dto.locationId, donorId, firstName: dto.firstName, lastName: dto.lastName, dateOfBirth: new Date(dto.dateOfBirth), gender: dto.gender, bloodGroup: dto.bloodGroup, rhFactor: dto.rhFactor || 'POSITIVE', phone: dto.phone, email: dto.email, address: dto.address, nationalId: dto.nationalId } });
      },
    });
  }
  async getDonor(tenantId: string, id: string) {
    const d = await this.prisma.bloodDonor.findFirst({ where: { id, tenantId }, include: { donations: true } });
    if (!d) throw new NotFoundException('Donor not found');
    return d;
  }
  async recordDonation(tenantId: string, userId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'BloodDonation',
      idColumn: 'donationNumber',
      prefix: 'BLD-',
      tenantId,
      callback: async (tx, donationNumber) => {
        const donation = await tx.bloodDonation.create({ data: { tenantId, locationId: dto.locationId, donorId: dto.donorId, donationNumber, donationType: dto.donationType || 'VOLUNTARY', bagNumber: dto.bagNumber, bloodGroup: dto.bloodGroup, rhFactor: dto.rhFactor, hemoglobinGdl: dto.hemoglobinGdl, expiryDate: new Date(dto.expiryDate), collectedById: userId, status: 'COLLECTED' } });
        await tx.bloodDonor.update({ where: { id: dto.donorId }, data: { lastDonationDate: new Date(), totalDonations: { increment: 1 } } });
        return donation;
      },
    });
  }
  async listInventory(tenantId: string, bloodGroup?: string, status?: string) {
    const where: any = { tenantId };
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (status) where.status = status;
    return this.prisma.bloodInventory.findMany({ where, orderBy: { expiryDate: 'asc' } });
  }
  async inventorySummary(tenantId: string) {
    const inv = await this.prisma.bloodInventory.findMany({ where: { tenantId, status: 'AVAILABLE' } });
    const groups: Record<string, number> = {};
    inv.forEach(i => { const key = `${i.bloodGroup}${i.rhFactor === 'POSITIVE' ? '+' : '-'}`; groups[key] = (groups[key] || 0) + 1; });
    return { total: inv.length, byGroup: groups };
  }
  async listTransfusions(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.bloodTransfusion.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  async orderTransfusion(tenantId: string, dto: any, userId?: string) {
    return this.prisma.bloodTransfusion.create({ data: { tenantId, locationId: dto.locationId, patientId: dto.patientId, admissionId: dto.admissionId, bagNumber: dto.bagNumber, component: dto.component, bloodGroup: dto.bloodGroup, rhFactor: dto.rhFactor, volumeMl: dto.volumeMl, orderedById: dto.orderedById || userId || '', status: 'ORDERED' } });
  }
  async crossMatch(tenantId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.bloodTransfusion.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Blood transfusion not found');
      return tx.bloodTransfusion.update({ where: { id, tenantId }, data: { crossMatchVerified: true, crossMatchById: userId, status: 'CROSS_MATCHED' } });
    });
  }
  async administer(tenantId: string, id: string, userId: string, dto: any) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.bloodTransfusion.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Blood transfusion not found');
      return tx.bloodTransfusion.update({ where: { id, tenantId }, data: { administeredById: userId, startTime: new Date(), status: 'ADMINISTERING', reaction: dto.reaction, reactionDetails: dto.reactionDetails } });
    });

    // Fire-and-forget ordering doctor alert. Any reaction status is included so
    // the doctor can react quickly if a reaction was flagged during start.
    // Patient is intentionally NOT emailed — could alarm without clinical context.
    this.sendTransfusionAdministerEmails(tenantId, updated).catch((err) => {
      this.logger.error(`Blood transfusion administer email dispatch failed: ${err?.message || err}`);
    });

    return updated;
  }

  // Compose + send ordering doctor alert when a transfusion starts. Non-blocking.
  private async sendTransfusionAdministerEmails(tenantId: string, transfusion: any): Promise<void> {
    const [patient, doctor, tenant] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: transfusion.patientId },
        select: { firstName: true, lastName: true, patientId: true },
      }),
      transfusion.orderedById
        ? this.prisma.doctorRegistry.findUnique({
            where: { id: transfusion.orderedById },
            select: { firstName: true, lastName: true, email: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tradeName: true, legalName: true },
      }),
    ]);

    if (!doctor?.email) return;

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const patientName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || '(unnamed)';
    const mrn = patient?.patientId || '—';

    const reaction = (transfusion.reaction || '').toString().toUpperCase();
    const hasReaction = reaction && reaction !== 'NONE' && reaction !== 'NO' && reaction !== 'NIL';
    const badge = hasReaction ? '🚨 REACTION FLAGGED' : '🩸 TRANSFUSION STARTED';

    const reactionBlock = hasReaction
      ? `<p style="color:#b91c1c;"><strong>Reaction:</strong> ${transfusion.reaction}${transfusion.reactionDetails ? ` — ${transfusion.reactionDetails}` : ''}</p>`
      : '<p><strong>Reaction:</strong> None reported at start.</p>';

    const subject = `${badge} Transfusion started — ${patientName} — ${orgName}`;
    const body = `Dr ${doctor.firstName || ''} ${doctor.lastName || ''},<br/><br/>
A blood transfusion you ordered has just been administered.<br/><br/>
<strong>Patient:</strong> ${patientName} (MRN ${mrn})<br/>
<strong>Bag Number:</strong> ${transfusion.bagNumber || '—'}<br/>
<strong>Component:</strong> ${transfusion.component || '—'}<br/>
<strong>Group:</strong> ${transfusion.bloodGroup || '—'}${transfusion.rhFactor === 'POSITIVE' ? '+' : transfusion.rhFactor === 'NEGATIVE' ? '-' : ''}<br/>
<strong>Volume:</strong> ${transfusion.volumeMl ? `${transfusion.volumeMl} mL` : '—'}<br/>
<strong>Started:</strong> ${transfusion.startTime ? new Date(transfusion.startTime).toLocaleString() : 'now'}<br/>
${reactionBlock}
<br/>Please monitor the patient and review observations during and after the transfusion.`;

    sendEmail(doctor.email, subject, emailTemplate(`Transfusion Started — ${badge}`, body, orgName))
      .catch((err) => this.logger.error(`Blood transfusion doctor alert email failed: ${err?.message || err}`));
  }
}
