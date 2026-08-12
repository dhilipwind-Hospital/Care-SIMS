import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { DoctorRegistryModule } from '../doctor-registry/doctor-registry.module';

@Module({
  imports: [DoctorRegistryModule],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
