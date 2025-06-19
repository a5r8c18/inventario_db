import { HttpException, HttpStatus } from '@nestjs/common';

export class FileUploadError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
