import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_pagador')
export class TipoPagador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: 'Paciente, Responsable, Externo' })
  nombre: string;
}
