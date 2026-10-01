import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('mesa_partes_tipo_evento')
export class MesaPartesTipoEvento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;
}
