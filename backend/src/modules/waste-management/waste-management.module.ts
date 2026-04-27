import { Module } from '@nestjs/common';
import { WasteManagementController } from './waste-management.controller';
import { WasteManagementService } from './waste-management.service';
@Module({ controllers: [WasteManagementController], providers: [WasteManagementService], exports: [WasteManagementService] })
export class WasteManagementModule {}
