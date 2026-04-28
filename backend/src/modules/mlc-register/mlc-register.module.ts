import { Module } from '@nestjs/common';
import { MlcRegisterController } from './mlc-register.controller';
import { MlcRegisterService } from './mlc-register.service';
@Module({ controllers: [MlcRegisterController], providers: [MlcRegisterService], exports: [MlcRegisterService] })
export class MlcRegisterModule {}
