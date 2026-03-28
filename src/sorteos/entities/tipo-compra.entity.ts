import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('tipo_compra')
export class TipoCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ type: 'tinyint', name: 'flg_activo', default: 1 })
  flgActivo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
