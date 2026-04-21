import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('grados_escolares')
export class GradoEscolar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 50, nullable: true })
  nivel: string; // 'primaria' o 'secundaria'

  @Column({ type: 'int', nullable: true })
  orden: number; // Para ordenar los grados

  @Column({ default: true })
  activo: boolean;
}
