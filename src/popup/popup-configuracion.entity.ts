import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('popup_configuracion')
export class PopupConfiguracion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  activo: boolean;

  @Column({ nullable: true, name: 'imagen_url', length: 500 })
  imagenUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
