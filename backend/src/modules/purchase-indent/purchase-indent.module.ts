import { Module } from '@nestjs/common';
import { PurchaseIndentController } from './purchase-indent.controller';
import { PurchaseIndentService } from './purchase-indent.service';
@Module({ controllers: [PurchaseIndentController], providers: [PurchaseIndentService], exports: [PurchaseIndentService] })
export class PurchaseIndentModule {}
