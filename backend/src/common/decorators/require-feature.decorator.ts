import { SetMetadata } from '@nestjs/common';
export const FEATURE_KEY = 'required_module';
export const RequireFeature = (moduleId: string) => SetMetadata(FEATURE_KEY, moduleId);
