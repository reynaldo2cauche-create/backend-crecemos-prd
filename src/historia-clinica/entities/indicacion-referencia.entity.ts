import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IndicacionTerapeutica } from './indicacion-terapeutica.entity';

@Entity('indicacion_referencia')
export class IndicacionReferencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indicacion_id' })
  indicacionId: number;

  // Internas
  @Column({ name: 'ref_inter_terapia_lenguaje', default: false })
  refInterTerapiaLenguaje: boolean;

  @Column({ name: 'ref_inter_terapia_ocupacional', default: false })
  refInterTerapiaOcupacional: boolean;

  @Column({ name: 'ref_inter_psicologia', default: false })
  refInterPsicologia: boolean;

  @Column({ name: 'ref_inter_psicoterapia_ind', default: false })
  refInterPsicoterapiaInd: boolean;

  @Column({ name: 'ref_inter_terapia_pareja_fam', default: false })
  refInterTerapiaParejaFam: boolean;

  @Column({ name: 'ref_inter_terapia_fisica', default: false })
  refInterTerapiaFisica: boolean;

  @Column({ name: 'ref_inter_terapia_respiratoria', default: false })
  refInterTerapiaRespiratoria: boolean;

  // Externas
  @Column({ name: 'ref_exter_neuropediatra', default: false })
  refExterNeuropediatra: boolean;

  @Column({ name: 'ref_exter_neuropsicologia', default: false })
  refExterNeuropsicologia: boolean;

  @Column({ name: 'ref_exter_psiquiatria', default: false })
  refExterPsiquiatria: boolean;

  @Column({ name: 'ref_exter_neurologia', default: false })
  refExterNeurologia: boolean;

  @Column({ name: 'ref_exter_gastroenterologo', default: false })
  refExterGastroenterologo: boolean;

  @Column({ name: 'ref_exter_nutricion', default: false })
  refExterNutricion: boolean;

  @Column({ name: 'ref_exter_otorrinolaringologia', default: false })
  refExterOtorrinolaringologia: boolean;

  @Column({ name: 'ref_exter_geriatria', default: false })
  refExterGeriatria: boolean;

  @Column({ name: 'ref_exter_otros', length: 255, nullable: true })
  refExterOtros: string;

  // Relación
  @ManyToOne(() => IndicacionTerapeutica, indicacion => indicacion.referencias)
  @JoinColumn({ name: 'indicacion_id' })
  indicacion: IndicacionTerapeutica;
}
