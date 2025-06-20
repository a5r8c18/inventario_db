/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DeliveryReport {
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