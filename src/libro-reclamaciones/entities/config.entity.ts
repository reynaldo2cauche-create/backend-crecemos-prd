import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('libro_reclamaciones_config')
export class LibroReclamacionesConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  razon_social: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ruc: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email_contacto: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;
}
