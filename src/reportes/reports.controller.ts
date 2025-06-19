/* eslint-disable prettier/prettier */


import { Controller, Get, Post, Param, Res, Query, Body, Request, UseGuards } from '@nestjs/common';
import { User } from '../auth/entities/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

import { ReportsService } from './reports.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly authService: AuthService
  ) {}

  @Get('reception')
  getAllReceptionReports(@Query() filters: any) {
    return this.reportsService.getAllReceptionReports(filters);
  }

  @Get('delivery')
  getAllDeliveryReports(@Query() filters: any) {
    return this.reportsService.getAllDeliveryReports(filters);
  }

  @Post('reception/:id/pdf')
  @UseGuards(JwtAuthGuard)
  async downloadPDF(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body()
    additionalData: {
      warehouseManager: string;
      transporterName: string;
      transporterPlate: string;
      transporterCI: string;
      signature: string;
    },
    @Res() res: Response,
  ) {
    // Obtener el nombre completo del usuario usando el servicio de autenticación
    const userName = await this.authService.getCurrentUserName(req.user.id);
    const dataWithReceptor = {
      ...additionalData,
      receptor: userName
    };
    const buffer = await this.reportsService.exportToPDF(id, dataWithReceptor,req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=informe-recepcion-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('reception/:id/excel')
  async downloadExcel(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportsService.exportToExcel(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=informe-recepcion-${id}.xlsx`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
