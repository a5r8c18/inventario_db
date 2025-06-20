/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Controller, Get, Param, Res, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getAllReports(@Query() filters: any) {
    return this.reportsService.getAllReports(filters);
  }

  @Get(':id/excel')
  async exportToExcel(@Param('id') id: string, @Res() res) {
    const buffer = await this.reportsService.exportToExcel(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=report-${id}.xlsx`,
    });
    res.send(buffer);
  }

  @Get(':id/pdf')
  async exportToPDF(@Param('id') id: string, @Res() res) {
    const buffer = await this.reportsService.exportToPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=report-${id}.pdf`,
    });
    res.send(buffer);
  }

  @Get('delivery')
  getAllDeliveryReports(@Query() filters: any) {
    return this.reportsService.getAllDeliveryReports(filters);
  }

  @Get('reception')
  getAllReceptionReports(@Query() filters: any) {
    return this.reportsService.getAllReceptionReports(filters);
  }
}