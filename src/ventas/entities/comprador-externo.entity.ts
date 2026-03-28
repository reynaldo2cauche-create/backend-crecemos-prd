import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('comprador_externo')
export class CompradorExterno {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, nullable: true })
  dni: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
