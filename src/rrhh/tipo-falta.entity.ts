import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_falta')
export class TipoFalta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  codigo: string; // FALTA_INJUSTIFICADA, PERMISO_SIN_GOCE, PERMISO_CON_GOCE, LICENCIA_MEDICA

  @Column({ length: 100 })
  nombre: string;

  @Column({ default: true })
  descuenta: boolean; // valor por defecto de si este tipo descuenta del sueldo

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
