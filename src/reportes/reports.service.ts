/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ReceptionReport } from './reception-report.entity';
import { DeliveryReport } from '../DeliveryReport/delivery-report.entity';
import * as XLSX from 'xlsx';
import { User } from '../auth/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import { Purchase } from 'src/compras/entity/purchase.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReceptionReport)
    private reportsRepository: Repository<ReceptionReport>,
    @InjectRepository(DeliveryReport)
    private deliveryReportRepository: Repository<DeliveryReport>,
  ) {}

  async getAllDeliveryReports(filters?: any): Promise<DeliveryReport[]> {
    const queryBuilder =
      this.deliveryReportRepository.createQueryBuilder('report');
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
    if (filters.entity) {
      queryBuilder.andWhere('report.entity LIKE :entity', {
        entity: `%${filters.entity}%`,
      });
    }
    if (filters.warehouse) {
      queryBuilder.andWhere('report.warehouse LIKE :warehouse', {
        warehouse: `%${filters.warehouse}%`,
      });
    }
    if (filters.document) {
      queryBuilder.andWhere('report.document LIKE :document', {
        document: `%${filters.document}%`,
      });
    }
    if (filters.code) {
      queryBuilder.andWhere('report.code = :code', { code: filters.code });
    }
    queryBuilder.orderBy('report.date', 'DESC');
    return queryBuilder.getMany();
  }

  async getAllReceptionReports(filters?: any): Promise<ReceptionReport[]> {
    const queryBuilder = this.reportsRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.purchase', 'purchase');
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
    if (filters.entity) {
      queryBuilder.andWhere('purchase.entity LIKE :entity', {
        entity: `%${filters.entity}%`,
      });
    }
    if (filters.warehouse) {
      queryBuilder.andWhere('purchase.warehouse LIKE :warehouse', {
        warehouse: `%${filters.warehouse}%`,
      });
    }
    if (filters.document) {
      queryBuilder.andWhere('purchase.document LIKE :document', {
        document: `%${filters.document}%`,
      });
    }
    if (filters.code) {
      queryBuilder.andWhere('report.code = :code', { code: filters.code });
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

  async exportToExcel(reportId: string): Promise<Buffer> {
    const report = await this.reportsRepository.findOne({
      where: { id: reportId },
      relations: ['purchase'],
    });
    if (!report || !report.details) {
      throw new BadRequestException(
        'Informe o detalles del informe no encontrados',
      );
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

  async exportToPDF(
    reportId: string,
    additionalData: {
      warehouseManager: string;
      transporterName: string;
      transporterPlate: string;
      transporterCI: string;
      signature: string; // Base64 de la imagen o texto
      receptor?: string; // Nombre del receptor
    },
    _user: User,
  ): Promise<Buffer> {
    const report = await this.reportsRepository.findOne({
      where: { id: reportId },
      relations: ['purchase'],
    });
    if (!report || !report.details) {
      throw new BadRequestException(
        'Informe o detalles del informe no encontrados',
      );
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

    // Tabla de productos
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
    const totalRow = ['', '', '', '', 'TOTAL', totalAmount.toFixed(2)];
    totalRow.forEach((cell, i) => {
      doc.font(i === 4 || i === 5 ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(cell, x + 2, y + 2, {
        width: colWidths[i] - 4,
        align: i === 5 ? 'right' : 'left',
      });
      x += colWidths[i];
    });
    y += rowHeight;

    doc.moveDown(2);

    // Cumplimiento
    doc.font('Helvetica').fontSize(10);
    doc.text(
      `Los materiales recibidos ${report.details.complies ? 'SÍ' : 'NO'} corresponden a la calidad, especificaciones, estado de conservación y cantidades que muestran los documentos del suministrador.`,
      { align: 'left' },
    );

    doc.moveDown(2);

    // Firmas
    doc.text(`Jefe de Almacén: ${additionalData.warehouseManager || '-'}`);
    doc.text(`Transportista: ${additionalData.transporterName || '-'}`);
    doc.text(`CI: ${additionalData.transporterCI || '-'}`);
    doc.text(`Chapa: ${additionalData.transporterPlate || '-'}`);

    // Firma electrónica (imagen o texto)
    if (
      additionalData.signature &&
      additionalData.signature.startsWith('data:image')
    ) {
      try {
        const imagePath = path.join(__dirname, 'temp_signature.png');
        const base64Data = additionalData.signature.replace(
          /^data:image\/png;base64,/,
          '',
        );
        fs.writeFileSync(imagePath, base64Data, 'base64');
        doc.image(imagePath, doc.x, doc.y, { width: 100 });
        doc.moveDown(3);
        fs.unlinkSync(imagePath); // Eliminar archivo temporal
      } catch (error) {
        console.error('Error al procesar la firma:', error);
        doc.text('Firma: [Error al cargar la firma]', { align: 'left' });
      }
    } else {
      doc.text(`Firma: ${additionalData.signature || '-'}`);
    }

    // Firmas adicionales
    const yFirmas = doc.y + 20;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / 3;

    doc.font('Helvetica').fontSize(10);
    doc.text(
      `Recepcionado: ${additionalData.receptor || '-'}`,
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
      code: `VE-${Date.now()}`,
      entity: data.entity,
      warehouse: data.warehouse,
      document: data.document,
      products: data.products,
      date: new Date(),
    });
    return this.deliveryReportRepository.save(report);
  }
}
