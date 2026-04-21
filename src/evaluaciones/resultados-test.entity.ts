import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TiposTest } from './tipos-test.entity';
import { Pregunta } from './pregunta.entity';
import { OpcionesPregunta } from './opciones-pregunta.entity';
import { DatosEstudiante } from './datos-estudiante.entity';
@Entity('resultados_test')
export class ResultadosTest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TiposTest)
  @JoinColumn({ name: 'tipo_test_id' })
  tipo_test: TiposTest;

  @ManyToOne(() => Pregunta)
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;

  @ManyToOne(() => OpcionesPregunta)
  @JoinColumn({ name: 'opcion_id' })
  opcion: OpcionesPregunta;

  @Column({ type: 'tinyint' })
  puntaje: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @ManyToOne(() => DatosEstudiante)
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: DatosEstudiante;
} 