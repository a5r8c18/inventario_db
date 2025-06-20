/* eslint-disable prettier/prettier */
import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseProduct } from './purchase-product.entity';
import { ReceptionReport } from '../../reportes/reception-report.entity';

@Entity()
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entity: string;

  @Column()
  warehouse: string;

  @Column()
  supplier: string;

  @Column()
  document: string;

  @OneToMany(() => PurchaseProduct, (product) => product.purchase, {
    cascade: true,
  })
  products: PurchaseProduct[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ default: 'completed' })
  status: string;

  @OneToMany(() => ReceptionReport, (report) => report.purchase)
  receptionReport: ReceptionReport[];
}