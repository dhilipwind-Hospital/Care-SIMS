import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';
import { profileStorage, documentStorage, imageFileFilter, documentFileFilter } from './multer.config';

@ApiTags('Uploads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private svc: UploadsService) {}

  @Post('profile-picture')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: profileStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadProfilePicture(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: this.svc.getFileUrl(file.filename, 'profiles'), filename: file.filename };
  }

  @Post('document')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: documentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: this.svc.getFileUrl(file.filename, 'documents'), filename: file.filename };
  }

  @Post('user/:userId/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: profileStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadUserPhoto(
    @CurrentUser('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = this.svc.getFileUrl(file.filename, 'profiles');
    await this.svc.updateUserPhoto(tenantId, userId, url);
    return { url };
  }

  @Post('patient/:patientId/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: profileStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadPatientPhoto(
    @CurrentUser('tenantId') tenantId: string,
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = this.svc.getFileUrl(file.filename, 'profiles');
    await this.svc.updatePatientPhoto(tenantId, patientId, url);
    return { url };
  }
}
