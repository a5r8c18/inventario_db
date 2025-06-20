/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { ReceptionReport } from './reception-report.entity';
import * as XLSX from 'xlsx';
import * as PDFKit from 'pdfkit';
import { Purchase } from '../compras/entity/purchase.entity';
import { DeliveryReport } from 'src/DeliveryReport/delivery-report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReceptionReport)
    private reportsRepository: Repository<ReceptionReport>,
    @InjectRepository(DeliveryReport)
    private deliveryReportRepository: Repository<DeliveryReport>,
  ) {}

  async getAllDeliveryReports(filters?: any): Promise<DeliveryReport[]> {
    const queryBuilder = this.deliveryReportRepository.createQueryBuilder('report');

    // Filtrar por fechas
    if (filters.fromDate) {
      queryBuilder.andWhere('report.date >= :fromDate', {
        fromDate: new Date(filters.fromDate),
      });
    }
    if (filters.toDate) {
      queryBuilder.andWhere('report.date <= :toDate', {
        toDate: new Date(filters.toDate),
      });
    }

    // Filtrar por entidad
    if (filters.entity) {
      queryBuilder.andWhere('report.entity LIKE :entity', {
        entity: `%${filters.entity}%`,
      });
    }

    // Filtrar por almacén
    if (filters.warehouse) {
      queryBuilder.andWhere('report.warehouse LIKE :warehouse', {
        warehouse: `%${filters.warehouse}%`,
      });
    }

    // Filtrar por documento
    if (filters.document) {
      queryBuilder.andWhere('report.document LIKE :document', {
        document: `%${filters.document}%`,
      });
    }

    // Filtrar por código
    if (filters.code) {
      queryBuilder.andWhere('report.code = :code', {
        code: filters.code,
      });
    }

    queryBuilder.orderBy('report.date', 'DESC');
    return queryBuilder.getMany();
  }

  async getAllReceptionReports(filters?: any): Promise<ReceptionReport[]> {
    const queryBuilder = this.reportsRepository.createQueryBuilder('report')
      .leftJoinAndSelect('report.purchase', 'purchase');

    // Filtrar por fechas
    if (filters.fromDate) {
      queryBuilder.andWhere('report.createdAt >= :fromDate', {
        fromDate: new Date(filters.fromDate),
      });
    }
    if (filters.toDate) {
      queryBuilder.andWhere('report.createdAt <= :toDate', {
        toDate: new Date(filters.toDate),
      });
    }

    // Filtrar por entidad
    if (filters.entity) {
      queryBuilder.andWhere('purchase.entity LIKE :entity', {
        entity: `%${filters.entity}%`,
      });
    }

    // Filtrar por almacén
    if (filters.warehouse) {
      queryBuilder.andWhere('purchase.warehouse LIKE :warehouse', {
        warehouse: `%${filters.warehouse}%`,
      });
    }

    // Filtrar por documento
    if (filters.document) {
      queryBuilder.andWhere('purchase.document LIKE :document', {
        document: `%${filters.document}%`,
      });
    }

    // Filtrar por código
    if (filters.code) {
      queryBuilder.andWhere('report.code = :code', {
        code: filters.code,
      });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');
    return queryBuilder.getMany();
  }
  async createReceptionReport(purchase: Purchase): Promise<ReceptionReport> {
    const report = this.reportsRepository.create({
      purchase,
      details: {
        entity: purchase.entity,
        warehouse: purchase.warehouse,
        supplier: purchase.supplier,
        document: purchase.document,
        products: purchase.products.map((product) => ({
          code: product.code,
          description: product.description,
          unit: product.unit,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          amount: product.amount,
        })),
        transportista: { nombre: '', ci: '', chapa: '' },
        receptor: { nombre: '' },
        documentType: 'FACTURA',
        complies: true,
      },
      createdAt: new Date(),
    });
    return this.reportsRepository.save(report);
  }

  async deleteByPurchaseId(purchaseId: string): Promise<void> {
    await this.reportsRepository.delete({ purchase: { id: purchaseId } });
  }

  async getAllReports(filters: any = {}): Promise<ReceptionReport[]> {
    const query = this.reportsRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.purchase', 'purchase');

    // Filtro por fecha (rango)
    if (filters.startDate && filters.endDate) {
      query.andWhere('report.date BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate,
      });
    } else if (filters.startDate) {
      query.andWhere('report.date >= :start', {
        start: filters.startDate,
      });
    } else if (filters.endDate) {
      query.andWhere('report.date <= :end', { end: filters.endDate });
    }

    // Filtrar por código
    if (filters.code) {
      query.andWhere('report.code = :code', {
        code: filters.code,
      });
    }

    return query.getMany();
  }
  async exportToExcel(reportId: string): Promise<Buffer> {
    const report = await this.reportsRepository.findOne({
      where: { id: reportId },
      relations: ['purchase'],
    });
    if (!report || !report.details) {
      throw new Error('Report or report details not found');
    }

    const data: Array<{
      label: string;
      value: any;
      unit?: string;
      quantity?: any;
      unitPrice?: any;
      amount?: any;
    }> = [
      { label: 'INFORME DE RECEPCIÓN', value: '' },
      { label: 'Entidad', value: report.details.entity },
      { label: 'Almacén', value: report.details.warehouse },
      { label: 'Empresa Suministradora', value: report.details.supplier },
      { label: 'Documento', value: report.details.document },
      {
        label: 'Tipo de Documento',
        value: report.details.documentType || 'FACTURA',
      },
      {
        label: 'Cumple con especificaciones',
        value: report.details.complies ? 'SÍ' : 'NO',
      },
      { label: '', value: '' },
      { label: 'Productos:', value: '' },
    ];

    data.push({
      label: 'Código',
      value: 'Descripción',
      unit: 'U/M',
      quantity: 'CANT.',
      unitPrice: 'P. UNIT.',
      amount: 'IMPORTE',
    });

    if (Array.isArray(report.details.products)) {
      report.details.products.forEach((product: any) => {
        data.push({
          label: product.code,
          value: product.description,
          unit: product.unit,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          amount: product.amount,
        });
      });
    }

    const totalAmount = report.details.products.reduce(
      (sum: number, product: any) => sum + (product.amount || 0),
      0,
    );
    data.push({
      label: 'TOTAL',
      value: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      amount: totalAmount,
    });

    const ws = XLSX.utils.json_to_sheet(
      data.map((item) => ({
        Código: item.label,
        Descripción: item.value,
        'U/M': item.unit,
        'CANT.': item.quantity,
        'P. UNIT.': item.unitPrice,
        IMPORTE: item.amount,
      })),
      {
        header: [
          'Código',
          'Descripción',
          'U/M',
          'CANT.',
          'P. UNIT.',
          'IMPORTE',
        ],
      },
    );

    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async exportToPDF(reportId: string): Promise<Buffer> {
    const report = await this.reportsRepository.findOne({
      where: { id: reportId },
      relations: ['purchase'],
    });
    if (!report || !report.details) {
      throw new Error('Report or report details not found');
    }

    const PDFKit = require('pdfkit');
    const doc = new PDFKit({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    doc.fontSize(16).text('INFORME DE RECEPCIÓN', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Entidad: ${report.details.entity || '-'}`);
    doc.text(`Almacén: ${report.details.warehouse || '-'}`);
    doc.text(`Empresa Suministradora: ${report.details.supplier || '-'}`);
    doc.text(`Documento: ${report.details.document || '-'}`);
    doc.text(`Tipo de Documento: ${report.details.documentType || 'FACTURA'}`);
    doc.moveDown();

    // --- Tabla manual ---
    const tableTop = doc.y + 10;
    const colWidths = [60, 120, 40, 40, 60, 60];
    const startX = doc.x;
    const rowHeight = 20;

    // Encabezados
    const headers = [
      'Código',
      'Descripción',
      'U/M',
      'CANT.',
      'P. UNIT.',
      'IMPORTE',
    ];
    let x = startX;
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
      doc.text(header, x + 2, tableTop + 2, {
        width: colWidths[i] - 4,
        align: 'left',
      });
      x += colWidths[i];
    });

    // Línea debajo de encabezados
    doc
      .moveTo(startX, tableTop + rowHeight - 2)
      .lineTo(
        startX + colWidths.reduce((a, b) => a + b, 0),
        tableTop + rowHeight - 2,
      )
      .stroke();

    // Filas de productos
    let y = tableTop + rowHeight;
    doc.font('Helvetica').fontSize(10);
    (report.details.products || []).forEach((product: any) => {
      x = startX;
      const row = [
        product.code || '-',
        product.description || '-',
        product.unit || '-',
        product.quantity?.toString() || '0',
        product.unitPrice ? product.unitPrice.toFixed(2) : '-',
        product.amount ? product.amount.toFixed(2) : '-',
      ];
      row.forEach((cell, i) => {
        doc.text(cell, x + 2, y + 2, {
          width: colWidths[i] - 4,
          align: 'left',
        });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    // Total
    const totalAmount = report.details.products.reduce(
      (sum: number, product: any) => sum + (product.amount || 0),
      0,
    );
    x = startX;
    const totalRow = ['TOTAL', '', '', '', '', totalAmount.toFixed(2)];
    totalRow.forEach((cell, i) => {
      doc.font(i === 0 || i === 5 ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(cell, x + 2, y + 2, { width: colWidths[i] - 4, align: 'left' });
      x += colWidths[i];
    });
    y += rowHeight;

    doc.moveDown(2);

    // --- Texto final ---
    doc.font('Helvetica').fontSize(10);
    doc.text(
      `Los materiales recibidos ${report.details.complies ? 'SÍ' : 'NO'} corresponden a la calidad, especificaciones, estado de conservación y cantidades que muestran los documentos del suministrador.`,
      { align: 'left' },
    );

    doc.moveDown(2);
    doc.text('Jefe de Almacén: __________________', { align: 'left' });
    doc.text(`Transportista: ${report.details.transportista?.nombre || '-'}`, {
      align: 'left',
    });
    doc.text(`CI: ${report.details.transportista?.ci || '-'}`, {
      align: 'left',
    });
    doc.text(`Chapa: ${report.details.transportista?.chapa || '-'}`, {
      align: 'left',
    });
    doc.text('Firma: __________________', { align: 'left' });

    const yFirmas = doc.y + 20; // Puedes ajustar el valor para la separación vertical
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / 3;

    doc.font('Helvetica').fontSize(10);
    doc.text(
      'Recepcionado: __________________',
      doc.page.margins.left,
      yFirmas,
      { width: colWidth, align: 'left' },
    );
    doc.text(
      'Anotado: __________________',
      doc.page.margins.left + colWidth,
      yFirmas,
      { width: colWidth, align: 'left' },
    );
    doc.text(
      'Contabilizado: __________________',
      doc.page.margins.left + colWidth * 2,
      yFirmas,
      { width: colWidth, align: 'left' },
    );

    doc.end();
    return await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }

  ////////************************* DELIVERY ********************/////////////////

  async createDeliveryReport(data: {
    entity: string;
    warehouse: string;
    document: string;
    products: Array<{
      code: string;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  }): Promise<DeliveryReport> {
    const report = this.deliveryReportRepository.create({
      code: `VE-${Date.now()}`, // <--- Genera un código único
      entity: data.entity,
      warehouse: data.warehouse,
      document: data.document,
      products: data.products,
      date: new Date(),
      // Add other properties here only if they exist in DeliveryReport entity
    });
    // If you need to set createdAt or details, do it after creation if those properties exist
    // For example:
    // report.createdAt = new Date();
    // report.details = { ... };
    return this.deliveryReportRepository.save(report);
  }
}
