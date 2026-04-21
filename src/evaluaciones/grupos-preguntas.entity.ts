import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TiposTest } from './tipos-test.entity';
import { PreguntasGrupo } from './preguntas-grupo.entity';


@Entity('grupos_preguntas')
export class GruposPreguntas {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TiposTest)
  @JoinColumn({ name: 'tipo_test_id' })
  tipo_test: TiposTest;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: 1 })
  orden: number;

  @OneToMany(() => PreguntasGrupo, pg => pg.grupo)
  preguntas_grupo: PreguntasGrupo[];
} 