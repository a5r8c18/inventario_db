/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Inventory {
  @PrimaryColumn()
  productCode: string;

  @Column()
  productName: string;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  entries: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  exits: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  stock: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0, nullable: true })
  stockLimit: number;
  productUnit: any;
  warehouse: string;
  entity: string;
  productDescription: string;
  unitPrice: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
