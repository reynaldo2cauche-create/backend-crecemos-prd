import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GruposPreguntas } from './grupos-preguntas.entity';
import { Pregunta } from './pregunta.entity';

@Entity('preguntas_grupo')
export class PreguntasGrupo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GruposPreguntas, grupo => grupo.preguntas_grupo)
  @JoinColumn({ name: 'grupo_id' })
  grupo: GruposPreguntas;

  @ManyToOne(() => Pregunta)
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;

  @Column({ default: 1 })
  orden: number;
} 