import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { PrescriptionsService } from './prescriptions.service';

// Thresholds tuned to "OPD prescription not picked up in a reasonable
// window". A Rx that's been pending for two weeks is essentially abandoned;
// auto-cancelling it lets the dedup-by-referenceId scheme reverse any
// charges that were added at Send time (still works while the invoice is
// DRAFT/PENDING).
const STALE_WARN_DAYS = 3;
const STALE_AUTO_CANCEL_DAYS = 14;
const STALE_STATUSES = ['PENDING', 'SENT_TO_PHARMACY'];
const SYSTEM_USER_ID = 'system';
const AUTO_CANCEL_REASON = 'Auto-cancelled — not dispensed within 14 days';

@Injectable()
export class PrescriptionAgingService {
  private readonly logger = new Logger(PrescriptionAgingService.name);

  constructor(
    private prisma: PrismaService,
    private prescriptions: PrescriptionsService,
  ) {}

  // Runs every 6 hours. Two passes per cycle: a warn-log pass at 3 days so
  // ops can see what's stuck, and an auto-cancel pass at 14 days that
  // delegates to PrescriptionsService.cancel() so charge reversal goes
  // through the existing audited path.
  @Cron(CronExpression.EVERY_6_HOURS)
  async sweepStaleRxs() {
    const now = Date.now();
    const warnCutoff = new Date(now - STALE_WARN_DAYS * 24 * 60 * 60 * 1000);
    const cancelCutoff = new Date(now - STALE_AUTO_CANCEL_DAYS * 24 * 60 * 60 * 1000);

    // Warn pass — log only; future enhancement can email the pharmacy lead.
    const warnList = await this.prisma.prescription.findMany({
      where: {
        issuedAt: { lte: warnCutoff, gt: cancelCutoff },
        status: { in: STALE_STATUSES },
      },
      select: { id: true, tenantId: true, rxNumber: true, issuedAt: true, status: true },
      take: 500,
    });
    if (warnList.length > 0) {
      this.logger.warn(`${warnList.length} prescription(s) idle ${STALE_WARN_DAYS}+ days and not yet dispensed`);
    }

    // Cancel pass — anything past the hard cutoff gets cancelled.
    const cancelList = await this.prisma.prescription.findMany({
      where: {
        issuedAt: { lte: cancelCutoff },
        status: { in: STALE_STATUSES },
      },
      select: { id: true, tenantId: true, rxNumber: true },
      take: 200,
    });

    let cancelled = 0;
    for (const rx of cancelList) {
      try {
        await this.prescriptions.cancel(rx.tenantId, rx.id, AUTO_CANCEL_REASON, SYSTEM_USER_ID);
        cancelled++;
      } catch (err) {
        this.logger.error(`Failed to auto-cancel stale Rx ${rx.rxNumber} (${rx.id})`, err as any);
      }
    }
    if (cancelled > 0) {
      this.logger.log(`Auto-cancelled ${cancelled} stale prescription(s) (${STALE_AUTO_CANCEL_DAYS}+ days idle)`);
    }
  }
}
