import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}
  @Get() getForUser(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Query() q: any) { return this.svc.getForUser(tid, uid, q); }
  @Get('unread-count') unreadCount(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string) { return this.svc.getUnreadCount(tid, uid); }
  @Patch(':id/read') markRead(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.markRead(tid, id, uid); }
  @Patch('mark-all-read') markAllRead(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string) { return this.svc.markAllRead(tid, uid); }
}
