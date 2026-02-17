import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TipoCompra } from './tipo-compra.entity';
import { Paquete } from './paquete.entity';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'paciente_id' })
  pacienteId: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int', name: 'tipo_compra_id' })
  tipoCompraId: number;

  @ManyToOne(() => TipoCompra)
  @JoinColumn({ name: 'tipo_compra_id' })
  tipoCompra: TipoCompra;

  @Column({ type: 'int', name: 'paquete_id', nullable: true })
  paqueteId: number;

  @ManyToOne(() => Paquete, { nullable: true })
  @JoinColumn({ name: 'paquete_id' })
  paquete: Paquete;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int', name: 'sesiones_totales' })
  sesionesTotales: number;

  @Column({ type: 'int', name: 'sesiones_usadas', default: 0 })
  sesionesUsadas: number;

  @Column({ type: 'date', name: 'fecha_compra' })
  fechaCompra: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
