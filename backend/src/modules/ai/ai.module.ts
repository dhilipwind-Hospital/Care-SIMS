import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';

// Global because every feature module that wants AI just injects AiService
// without having to import this module in its own imports[].
@Global()
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
