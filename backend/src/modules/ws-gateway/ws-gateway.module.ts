import { Module, Global } from '@nestjs/common';
import { WsGateway } from './ws-gateway.gateway';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [WsGateway],
  exports: [WsGateway],
})
export class WsGatewayModule {}
