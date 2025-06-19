/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Purchase } from './purchase.entity';

@Entity()
export class PurchaseProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.products)
  purchase: Purchase;

  @Column()
  code: string;

  @Column()
  description: string;

  @Column()
  unit: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('timestamp', { nullable: true })
  expirationDate: Date | null;
}
