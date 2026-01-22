import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoDocumento } from '../catalogos/tipo-documento.entity';
import { Sexo } from '../catalogos/sexo.entity';
import { Distrito } from '../catalogos/distrito.entity';
import { RelacionResponsable } from '../catalogos/relacion-responsable.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { EstadoPaciente } from './estado-paciente.entity';
import { PacienteServicio } from './paciente-servicio.entity';
import { ParejaPaciente } from './entities/pareja-paciente.entity';
import { PacienteResponsable } from './entities/paciente-responsable.entity';
import { ReporteEvolucion } from '../historia-clinica/entities/reporte-evolucion.entity';
import { EntrevistaPadres } from '../historia-clinica/entities/entrevista-padres.entity';

@Entity()
export class Paciente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombres: string;

  @Column()
  apellido_paterno: string;

  @Column()
  apellido_materno: string;

  @Column()
  fecha_nacimiento: Date;

  @ManyToOne(() => TipoDocumento)
  @JoinColumn({ name: 'tipo_documento_id' })
  tipo_documento: TipoDocumento;

  @Column()
  numero_documento: string;

  @ManyToOne(() => Sexo)
  @JoinColumn({ name: 'sexo_id' })
  sexo: Sexo;

  @ManyToOne(() => Distrito)
  @JoinColumn({ name: 'distrito_id' })
  distrito: Distrito;

  @ManyToOne(() => Servicios, { nullable: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  celular: string;

  @Column({ nullable: true })
  celular2: string;  

  @Column({ nullable: true })
  correo: string;

  @Column({ nullable: true })
  motivo_consulta: string;

  @Column({ nullable: true })
  referido_por: string;

  @Column({ nullable: true })
  responsable_nombre: string;

  @Column({ nullable: true })
  responsable_apellido_paterno: string;

  @Column({ nullable: true })
  responsable_apellido_materno: string;

  @ManyToOne(() => TipoDocumento, { nullable: true })
  @JoinColumn({ name: 'responsable_tipo_documento_id' })
  responsable_tipo_documento: TipoDocumento;

  @Column({ nullable: true })
  responsable_numero_documento: string;

  @ManyToOne(() => RelacionResponsable, { nullable: true })
  @JoinColumn({ name: 'responsable_relacion_id' })
  responsable_relacion: RelacionResponsable;

  @Column({ nullable: true })
  responsable_telefono: string;

  @Column({ nullable: true })
  responsable_email: string;

  @Column({ nullable: true })
  diagnostico_medico: string;

  @Column({ nullable: true })
  alergias: string;

  @Column({ nullable: true })
  medicamentos_actuales: string;

  @Column({ default: false })
  acepta_terminos: boolean;

  @Column({ default: false })
  acepta_info_comercial: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: true })
  mostrar_en_listado: boolean;

  @ManyToOne(() => EstadoPaciente, { eager: true, nullable: true })
  @JoinColumn({ name: 'estado_paciente_id' })
  estado: EstadoPaciente;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    transformer: {
      to: (value: Date) => value,
      from: (value: Date) => {
        if (value) {
          return new Date(value.getTime() - (5 * 60 * 60 * 1000)); // Resta 5 horas
        }
        return value;
      }
    }
  })
  created_at: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP',
    transformer: {
      to: (value: Date) => value,
      from: (value: Date) => {
        if (value) {
          return new Date(value.getTime() - (5 * 60 * 60 * 1000)); // Resta 5 horas
        }
        return value;
      }
    }
  })
  updated_at: Date;

  @Column({ nullable: true })
  user_id_crea: number;

  @Column({ nullable: true })
  user_id_actua: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_crea: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  fecha_actua: Date;

  @OneToMany(() => PacienteServicio, pacienteServicio => pacienteServicio.paciente)
  pacienteServicios: PacienteServicio[];

  @OneToMany(() => ParejaPaciente, pareja => pareja.paciente)
  parejas: ParejaPaciente[];

  @OneToMany(() => ReporteEvolucion, reporte => reporte.paciente)
  reportesEvolucion: ReporteEvolucion[];

  @OneToMany(() => EntrevistaPadres, entrevista => entrevista.paciente)
  entrevistasPadres: EntrevistaPadres[];

  @OneToMany(() => PacienteResponsable, (responsable) => responsable.paciente, { cascade: true })
  responsables: PacienteResponsable[];
}