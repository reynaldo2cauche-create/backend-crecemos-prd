import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IndicacionTerapeutica } from './indicacion-terapeutica.entity';

@Entity('indicacion_materiales')
export class IndicacionMateriales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indicacion_id' })
  indicacionId: number;

  @Column({ name: 'hojas_bond', default: false })
  hojasBond: boolean;

  @Column({ default: false })
  plumones: boolean;

  @Column({ name: 'lapiz_borrador', default: false })
  lapizBorrador: boolean;

  @Column({ name: 'cartulina_duplex', default: false })
  cartulinaDuplex: boolean;

  @Column({ name: 'silicona_liquida', default: false })
  siliconaLiquida: boolean;

  @Column({ default: false })
  limpiatipo: boolean;

  @Column({ default: false })
  velcro: boolean;

  @Column({ name: 'cartulina_colores', default: false })
  cartulinaColores: boolean;

  @Column({ default: false })
  cuaderno: boolean;

  @Column({ default: false })
  folder: boolean;

  @Column({ default: false })
  fotos: boolean;

  @Column({ name: 'guantes_bajalengua_hisopos_crema', default: false })
  guantesBajalenguaHisoposCrema: boolean;

  // ── Materiales granulares de Terapia de Lenguaje ──
  @Column({ default: false })
  guantes: boolean;

  @Column({ default: false })
  bajalengua: boolean;

  @Column({ name: 'hisopos_pequenos', default: false })
  hisoposPequenos: boolean;

  @Column({ name: 'hisopos_largos', default: false })
  hisoposLargos: boolean;

  @Column({ name: 'plumones_gruesos', default: false })
  plumonesGruesos: boolean;

  @Column({ name: 'cuaderno_cuadriculado', default: false })
  cuadernoCuadriculado: boolean;

  @Column({ name: 'cuaderno_decroly', default: false })
  cuadernoDecroly: boolean;

  @Column({ name: 'cinta_embalaje', default: false })
  cintaEmbalaje: boolean;

  @Column({ name: 'botella_agua', default: false })
  botellaAgua: boolean;

  @Column({ name: 'plumon_indeleble', default: false })
  plumonIndeleble: boolean;

  @Column({ default: false })
  munecos: boolean;

  @Column({ length: 255, nullable: true })
  otros: string;

  // Relación
  @ManyToOne(() => IndicacionTerapeutica, indicacion => indicacion.materiales)
  @JoinColumn({ name: 'indicacion_id' })
  indicacion: IndicacionTerapeutica;
}
