import { Controller, Get, Patch, Param, Query, UseGuards, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { sendEmail, getLastEmailError, getEmailProvider } from '../../common/utils/mailer';

@ApiTags('Notifications') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}
  @Get() getForUser(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Query() q: any) { return this.svc.getForUser(tid, uid, q); }
  @Get('unread-count') unreadCount(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string) { return this.svc.getUnreadCount(tid, uid); }
  @Patch(':id/read') markRead(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.markRead(tid, id, uid); }
  @Patch('mark-all-read') markAllRead(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string) { return this.svc.markAllRead(tid, uid); }
}

@ApiTags('Health') @Controller('health')
export class EmailHealthController {
  @Get('email')
  emailConfig() {
    const provider = getEmailProvider();
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || null;
    if (provider === 'sendgrid') {
      return {
        configured: true,
        provider: 'SendGrid',
        apiKeySet: true,
        from,
        lastError: getLastEmailError(),
      };
    }
    if (provider === 'resend') {
      return {
        configured: true,
        provider: 'Resend',
        apiKeySet: true,
        from,
        lastError: getLastEmailError(),
      };
    }
    if (provider === 'smtp') {
      const host = process.env.SMTP_HOST;
      return {
        configured: true,
        provider: host?.includes('brevo') ? 'Brevo (SMTP)' : host?.includes('sendgrid') ? 'SendGrid (SMTP)' : host?.includes('mailtrap') ? 'Mailtrap (SMTP)' : `SMTP (${host})`,
        host,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        passSet: !!process.env.SMTP_PASS,
        from,
        lastError: getLastEmailError(),
      };
    }
    return { configured: false, provider: 'none', from, lastError: getLastEmailError() };
  }

  @Post('email/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async sendTest(@Body() body: { to?: string }, @CurrentUser('email') currentEmail: string) {
    const to = body?.to || currentEmail;
    if (!to) throw new BadRequestException('No recipient: provide "to" or sign in with an account that has an email');
    const subject = 'Ayphen HMS – SMTP test email';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h3 style="color: #0F766E;">SMTP test successful</h3>
        <p>If you are reading this, your Brevo (or configured SMTP) integration is working.</p>
        <p style="color:#666;font-size:13px;">Sent at ${new Date().toISOString()}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">Ayphen HMS</p>
      </div>
    `;
    const ok = await sendEmail(to, subject, html);
    if (!ok) throw new BadRequestException(`SMTP send failed: ${getLastEmailError() || 'unknown error'}`);
    return { sent: true, to, subject };
  }
}
