/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Purchase } from '../compras/entity/purchase.entity';

@Entity()
export class ReceptionReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.receptionReport)
  purchase: Purchase;

  @Column('json')
  details: any;



  @Column()
  createdAt: Date;
}
