import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pregunta } from './pregunta.entity';

@Entity('opciones_pregunta')
export class OpcionesPregunta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Pregunta, pregunta => pregunta.opciones)
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;

  @Column({ type: 'text' })
  descripcion: string;

  @Column()
  puntaje: number;

  @Column({ default: 1 })
  orden: number;
} 