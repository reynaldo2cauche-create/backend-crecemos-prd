import { IsNotEmpty, IsInt, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateEntrevistaAdultosDto {
  @IsNotEmpty() @IsInt()
  pacienteId: number;

  @IsNotEmpty() @IsInt()
  usuarioId: number;

  @IsNotEmpty() @IsDateString()
  fecha: string;

  // i. DATOS GENERALES
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() edad?: string;
  @IsOptional() @IsString() genero?: string;
  @IsOptional() @IsString() lugarNacimiento?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @IsString() domicilioActual?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() estadoCivil?: string;
  @IsOptional() @IsString() religion?: string;
  @IsOptional() @IsString() escolaridad?: string;
  @IsOptional() @IsString() ocupacion?: string;
  @IsOptional() @IsInt() remitidoPorId?: number;

  // ii. MOTIVO DE CONSULTA
  @IsOptional() @IsString() motivoConsulta?: string;

  // iii. ANTECEDENTES DE LA SITUACIÓN
  @IsOptional() @IsString() antecedentesSituacion?: string;
  @IsOptional() @IsString() funcionesOrganicas?: string;

  // iv. HISTORIA FAMILIAR - PADRE
  @IsOptional() @IsString() nombrePadre?: string;
  @IsOptional() @IsString() edadPadre?: string;
  @IsOptional() @IsString() escolaridadOcupacionPadre?: string;
  @IsOptional() @IsString() enfermedadesPadre?: string;
  @IsOptional() @IsString() relacionPadrePaciente?: string;
  @IsOptional() @IsString() imposicionCastigosPadre?: string;

  // iv. HISTORIA FAMILIAR - MADRE
  @IsOptional() @IsString() nombreMadre?: string;
  @IsOptional() @IsString() edadMadre?: string;
  @IsOptional() @IsString() escolaridadOcupacionMadre?: string;
  @IsOptional() @IsString() enfermedadesMadre?: string;
  @IsOptional() @IsString() relacionMadrePaciente?: string;
  @IsOptional() @IsString() imposicionCastigosMadre?: string;

  // iv. HISTORIA FAMILIAR - HERMANOS
  @IsOptional() @IsString() relacionHermanos?: string;
  @IsOptional() @IsString() antecedentesMedicosPsiquiatricosFamilia?: string;

  // v. SÍNTOMAS NEURÓTICOS
  @IsOptional() @IsBoolean() pesadillasPresente?: boolean;
  @IsOptional() @IsString()  pesadillasDetalle?: string;

  @IsOptional() @IsBoolean() terrorNocturnoPresente?: boolean;
  @IsOptional() @IsString()  terrorNocturnoDetalle?: string;

  @IsOptional() @IsBoolean() sonambulismoPresente?: boolean;
  @IsOptional() @IsString()  sonambulismoDetalle?: string;

  @IsOptional() @IsBoolean() enuresisPresente?: boolean;
  @IsOptional() @IsString()  enuresisDetalle?: string;

  @IsOptional() @IsBoolean() onicofagiaPresente?: boolean;
  @IsOptional() @IsString()  onicofagiaDetalle?: string;

  @IsOptional() @IsBoolean() obsesionesCompulsionesPresente?: boolean;
  @IsOptional() @IsString()  obsesionesCompulsionesDetalle?: string;

  @IsOptional() @IsBoolean() fobiasPresente?: boolean;
  @IsOptional() @IsString()  fobiasDetalle?: string;

  @IsOptional() @IsBoolean() inquietudPresente?: boolean;
  @IsOptional() @IsString()  inquietudDetalle?: string;

  @IsOptional() @IsBoolean() miedoEstarSoloPresente?: boolean;
  @IsOptional() @IsString()  miedoEstarSoloDetalle?: string;

  // vi. SALUD FÍSICA
  @IsOptional() @IsString() infecciones?: string;
  @IsOptional() @IsString() cefalea?: string;
  @IsOptional() @IsString() convulsiones?: string;
  @IsOptional() @IsString() enfermedadesRespiratorias?: string;
  @IsOptional() @IsString() intervencionesQuirurgicas?: string;

  // vii. SOCIALIZACIÓN
  @IsOptional() @IsString() socializacion?: string;
  @IsOptional() @IsString() conductaUniversidadTrabajo?: string;
  @IsOptional() @IsString() ocupacionActualDetalles?: string;

  // viii. ANTECEDENTES PERSONALES
  @IsOptional() @IsString() circunstanciaEmbarazo?: string;
  @IsOptional() @IsString() planificadoReaccionPadres?: string;
  @IsOptional() @IsString() tipoParto?: string;
  @IsOptional() @IsString() recienNacido?: string;
  @IsOptional() @IsString() lactancia?: string;
  @IsOptional() @IsString() desarrolloMotor?: string;
  @IsOptional() @IsString() controlEsfinteres?: string;
  @IsOptional() @IsString() informacionSexualAdquirida?: string;
  @IsOptional() @IsString() enfermedadesVenereas?: string;
  @IsOptional() @IsString() periodoMenstrual?: string;
  @IsOptional() @IsString() sintomasMenstruacion?: string;

  // ix. HISTORIAL SEXUAL
  @IsOptional() @IsString() opinionNoviazgoMatrimonio?: string;
  @IsOptional() @IsString() experienciasNoviazgoMatrimonio?: string;

  // x. HÁBITOS Y ASPECTOS JUDICIALES
  @IsOptional() @IsBoolean() alcoholPresente?: boolean;
  @IsOptional() @IsString()  alcohol?: string;

  @IsOptional() @IsBoolean() tabacoPresente?: boolean;
  @IsOptional() @IsString()  tabaco?: string;

  @IsOptional() @IsString() drogasPresente?: string;
  @IsOptional() @IsString() drogas?: string;

  @IsOptional() @IsString() acusadoDetenidoPreso?: string;

  // xi. PERSONALIDAD PREVIA
  @IsOptional() @IsString() seguridadSiMismo?: string;
  @IsOptional() @IsString() tomaDecisiones?: string;
  @IsOptional() @IsString() miedoAbandono?: string;
  @IsOptional() @IsString() confianzaOtros?: string;
  @IsOptional() @IsString() actosImpulsivos?: string;
  @IsOptional() @IsString() preocupacionRechazoCritica?: string;
  @IsOptional() @IsString() preocupacionFracaso?: string;
  @IsOptional() @IsString() gustoSerAtractivo?: string;

  // xii. OBJETIVOS TERAPÉUTICOS INICIALES
  @IsOptional() @IsString() objetivosTerapeuticos?: string;

  // xiii. OBSERVACIONES GENERALES Y RECOMENDACIONES
  @IsOptional() @IsString() observacionesRecomendaciones?: string;
}

export class UpdateEntrevistaAdultosDto extends PartialType(CreateEntrevistaAdultosDto) {
  @IsOptional() @IsInt() userIdActua?: number;
}