import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { EntrevistaPadres } from './entrevista-padres.entity';
import { Ocupaciones } from '../../catalogos/ocupaciones.entity';

@Entity('familiares_entrevista')
export class FamiliarEntrevista {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entrevista_id' })
  entrevistaId: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 100 })
  tipo: string;

  @Column({ type: 'int' })
  edad: number;

  @Column({ name: 'ocupacion_id' })
  ocupacionId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @Column({ default: true })
  activo: boolean;

  // Relaciones
  @ManyToOne(() => EntrevistaPadres)
  @JoinColumn({ name: 'entrevista_id' })
  entrevista: EntrevistaPadres;

  @ManyToOne(() => Ocupaciones)
  @JoinColumn({ name: 'ocupacion_id' })
  ocupacion: Ocupaciones;
}
