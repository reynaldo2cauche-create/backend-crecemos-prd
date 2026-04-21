import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TiposTest } from './tipos-test.entity';
import { OpcionesPregunta } from './opciones-pregunta.entity';

@Entity('preguntas')
export class Pregunta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TiposTest)
  @JoinColumn({ name: 'tipo_test_id' })
  tipo_test: TiposTest;

  @Column()
  codigo: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  instruccion: string;

  @Column({ nullable: true })
  tiempo: string;

  @Column({ default: 1 })
  orden: number;

  @OneToMany(() => OpcionesPregunta, opcion => opcion.pregunta)
  opciones: OpcionesPregunta[];
} 