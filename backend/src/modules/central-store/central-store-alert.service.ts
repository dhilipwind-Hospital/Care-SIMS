import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Send at most one stock-alert notification per recipient per 23h, so the
// 6-hour cron doesn't spam the pharmacy lead four times a day with the
// same message.
const COOLDOWN_MS = 23 * 60 * 60 * 1000;
const ALERT_TYPE = 'STOCK_ALERT';
const NOTIFY_ROLES = ['SYS_PHARMACY_INCHARGE', 'SYS_ORG_ADMIN'];

@Injectable()
export class CentralStoreAlertService {
  private readonly logger = new Logger(CentralStoreAlertService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Sweeps every 6 hours. For each tenant with low-stock or out-of-stock
  // Central Store items, posts one summary notification to each pharmacy
  // in-charge / org admin. Skipped if a recent alert is already on file.
  @Cron(CronExpression.EVERY_6_HOURS)
  async sweepLowStock() {
    // Compare two columns — Prisma can't do this with its typed API, so
    // use raw SQL for the filter.
    const lowItems = await this.prisma.$queryRawUnsafe<Array<{
      id: string; tenant_id: string; name: string; item_code: string;
      current_stock: number; reorder_level: number;
    }>>(
      `SELECT id, tenant_id, name, item_code, current_stock, reorder_level
         FROM store_items
        WHERE is_active = true
          AND current_stock <= reorder_level`,
    );
    if (!lowItems.length) return;

    // Group by tenant.
    const byTenant = new Map<string, typeof lowItems>();
    for (const it of lowItems) {
      const arr = byTenant.get(it.tenant_id) || [];
      arr.push(it);
      byTenant.set(it.tenant_id, arr);
    }

    let totalSent = 0;
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);

    for (const [tenantId, items] of byTenant.entries()) {
      const recipients = await this.prisma.tenantUser.findMany({
        where: {
          tenantId, isActive: true,
          role: { systemRoleId: { in: NOTIFY_ROLES } },
        },
        select: { id: true },
      });
      if (!recipients.length) continue;

      const out = items.filter(i => i.current_stock === 0).length;
      const low = items.length - out;
      const summary = items.slice(0, 5).map(i => `${i.name} (${i.current_stock}/${i.reorder_level})`).join(', ');
      const more = items.length > 5 ? `, +${items.length - 5} more` : '';
      const title = out > 0 && low > 0
        ? `Central Store: ${out} out-of-stock, ${low} low`
        : out > 0
          ? `Central Store: ${out} out of stock`
          : `Central Store: ${low} item${low > 1 ? 's' : ''} low`;
      const message = `Items at or below reorder level — ${summary}${more}`;

      for (const r of recipients) {
        // Skip if this user got a STOCK_ALERT within the cooldown window.
        const recent = await this.prisma.notification.findFirst({
          where: { tenantId, recipientId: r.id, type: ALERT_TYPE, createdAt: { gte: cooldownCutoff } },
          select: { id: true },
        });
        if (recent) continue;
        try {
          await this.notifications.send(tenantId, {
            recipientId: r.id, type: ALERT_TYPE, title, message,
            priority: out > 0 ? 'HIGH' : 'NORMAL',
            referenceType: 'CENTRAL_STORE',
          });
          totalSent++;
        } catch (err) {
          this.logger.error(`Failed to notify ${r.id} about Central Store stock`, err as any);
        }
      }
    }

    if (totalSent > 0) {
      this.logger.log(`Sent ${totalSent} Central Store stock-alert notification(s)`);
    }
  }
}
