import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TipoArchivo } from '../../historia-clinica/entities/tipo-archivo.entity';

@Entity('documento_tarifa')
export class DocumentoTarifa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tipo_archivo_id' })
  tipoArchivoId: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ name: 'flg_activo', type: 'tinyint', default: 1 })
  flgActivo: number;

  @Column({ name: 'user_crea_id', nullable: true })
  userCreaId: number;

  @Column({ name: 'user_actua_id', nullable: true })
  userActuaId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => TipoArchivo, { eager: true })
  @JoinColumn({ name: 'tipo_archivo_id' })
  tipoArchivo: TipoArchivo;
}
