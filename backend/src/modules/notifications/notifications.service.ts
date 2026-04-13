import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { sendEmail } from '../../common/utils/mailer';
import { sendPushNotification } from '../../common/utils/push-notification';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async getForUser(tenantId: string, userId: string, query: any) {
    const { unreadOnly, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, recipientId: userId };
    if (unreadOnly === 'true') where.isRead = false;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { tenantId, recipientId: userId, isRead: false } }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) }, unreadCount };
  }

  async markRead(tenantId: string, id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId, recipientId: userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async send(tenantId: string, dto: {
    recipientId: string; type: string; title: string; message: string;
    locationId?: string; referenceType?: string; referenceId?: string; priority?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId, recipientId: dto.recipientId, type: dto.type,
        title: dto.title, message: dto.message,
        locationId: dto.locationId, referenceType: dto.referenceType,
        referenceId: dto.referenceId, priority: dto.priority || 'NORMAL',
        isRead: false,
      },
    });
    // Push real-time notification to recipient
    this.ws.emitToUser(dto.recipientId, 'notification:new', notification);
    const unread = await this.getUnreadCount(tenantId, dto.recipientId);
    this.ws.emitToUser(dto.recipientId, 'notification:count', { count: unread });

    // Optionally send email notification
    try {
      const user = await this.prisma.tenantUser.findFirst({
        where: { id: dto.recipientId, tenantId },
        select: { email: true, firstName: true },
      });
      if (user?.email) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
        const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h3 style="color: #0F766E;">${dto.title}</h3>
            <p>${dto.message}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#aaa;font-size:12px;">${orgName}</p>
          </div>
        `;
        sendEmail(user.email, `${dto.title} - ${orgName}`, html).catch((err) =>
          this.logger.error(`Failed to send email notification to ${user.email}`, err),
        );
      }
    } catch (err) {
      this.logger.error('Error looking up user email for notification', err);
    }

    // Attempt push notification (non-blocking)
    try {
      const recipient = await (this.prisma.tenantUser as any).findFirst({
        where: { id: dto.recipientId, tenantId },
        select: { apnsToken: true, fcmToken: true },
      });
      if (recipient && (recipient.apnsToken || recipient.fcmToken)) {
        sendPushNotification(
          { apns: recipient.apnsToken, fcm: recipient.fcmToken },
          dto.title,
          dto.message,
          { type: dto.type, referenceType: dto.referenceType, referenceId: dto.referenceId },
        ).catch((err) =>
          this.logger.error(`Failed to send push notification to ${dto.recipientId}`, err),
        );
      }
    } catch (err) {
      this.logger.error('Error looking up device tokens for push notification', err);
    }

    return notification;
  }

  async getUnreadCount(tenantId: string, userId: string) {
    return this.prisma.notification.count({ where: { tenantId, recipientId: userId, isRead: false } });
  }
}
