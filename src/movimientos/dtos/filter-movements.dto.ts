/* eslint-disable prettier/prettier */
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class FilterMovementDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}
