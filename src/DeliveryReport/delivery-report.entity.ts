/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Purchase } from '../compras/entity/purchase.entity';

@Entity()
export class DeliveryReport {
  @ManyToOne(() => Purchase, purchase => purchase.deliveryReport)
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  entity: string;

  @Column({ nullable: true })
  warehouse: string;

  @Column({ nullable: true })
  document: string;

  @Column('jsonb', { nullable: true })
  products: any[];

  @Column({ type: 'timestamp', nullable: true })
  date: Date;
}
