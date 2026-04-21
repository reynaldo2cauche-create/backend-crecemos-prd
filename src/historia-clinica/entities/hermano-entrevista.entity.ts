import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { EntrevistaPadres } from './entrevista-padres.entity';
import { Sexo } from '../../catalogos/sexo.entity';

@Entity('hermanos_entrevista')
export class HermanoEntrevista {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entrevista_id' })
  entrevistaId: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'int' })
  edad: number;

  @Column({ name: 'sexo_id' })
  sexoId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @Column({ default: true })
  activo: boolean;

  // Relaciones
  @ManyToOne(() => EntrevistaPadres)
  @JoinColumn({ name: 'entrevista_id' })
  entrevista: EntrevistaPadres;

  @ManyToOne(() => Sexo)
  @JoinColumn({ name: 'sexo_id' })
  sexo: Sexo;
}
