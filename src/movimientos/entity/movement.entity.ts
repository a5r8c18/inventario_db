/* eslint-disable prettier/prettier */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Purchase } from '../../compras/entity/purchase.entity';
import { Inventory } from '../../inventario/inventory.entity';

@Entity()
export class Movement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @ManyToOne(() => Inventory, { eager: true })
  @JoinColumn({ name: 'productCode', referencedColumnName: 'productCode' })
  product: Inventory;

  @Column()
  productCode: string; // <-- Agrega este campo si no existe

  @Column("decimal", { precision: 10, scale: 2 })
  quantity: number;

  @Column({ nullable: true })
  reason: string;

  @Column()
  createdAt: Date;

  @ManyToOne(() => Purchase, { nullable: true })
  purchase: Purchase;

  @Column({ nullable: true })
  label: string;
}
