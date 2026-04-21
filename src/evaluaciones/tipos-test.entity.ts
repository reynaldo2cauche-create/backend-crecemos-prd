import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipos_test')
export class TiposTest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo: string;

  @Column()
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column()
  nivel: string;

  @Column()
  grados: string;

  @Column({ default: true })
  estado: boolean;

  @Column({ nullable: true })
  duracion: string;

  @Column({ nullable: true })
  finalidad: string;

  @Column({ nullable: true })
  objetivo: string;

  @Column({ nullable: true })
  aplicacion: string;

  @Column({ nullable: true })
  titulo_test_detallado: string;
} 