import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

export const profileStorage = diskStorage({
  destination: './uploads/profiles',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const documentStorage = diskStorage({
  destination: './uploads/documents',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const imageFileFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only image files (jpg, png, webp) are allowed'), false);
  }
};

export const documentFileFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only images and documents (pdf, doc) are allowed'), false);
  }
};
