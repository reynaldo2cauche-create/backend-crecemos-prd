import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

/**
 * Entidad para EVENTOS DEL SISTEMA
 * Registra todas las acciones importantes que ocurren en el sistema
 */
@Entity('eventos_sistema')
export class EventoSistema {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  tipo_evento: string; // ANIVERSARIO_LABORAL, CUMPLEANOS_PACIENTE, ACCESO_FUERA_HORARIO, CITA_ELIMINADA, CITA_MODIFICADA, NOTA_EVOLUCION

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int' })
  usuario_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_evento: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  dispositivo: string;

  @Column({ type: 'text', nullable: true })
  datos_adicionales: string; // JSON con información extra del evento
}
