import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('estado_paciente')
export class EstadoPaciente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;
} 