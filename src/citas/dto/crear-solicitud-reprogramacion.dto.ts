import { IsInt, IsOptional, IsString, IsObject, IsNotEmpty } from 'class-validator';

/**
 * Crea una solicitud de reprogramación. El frontend manda el mismo `payload`
 * (CrearCitaDto) que hoy usa para editar la cita, más el motivo y datos de
 * display. El snapshot "anterior" lo completa el backend leyendo la cita.
 */
export class CrearSolicitudReprogramacionDto {
  @IsInt()
  cita_id: number;

  @IsOptional()
  @IsInt()
  paciente_id?: number;

  @IsInt()
  solicitante_id: number;

  @IsNotEmpty({ message: 'El motivo de la reprogramación es obligatorio' })
  @IsString()
  motivo: string;

  // Cambios propuestos (display)
  @IsOptional()
  @IsString()
  fecha_nueva?: string;

  @IsOptional()
  @IsString()
  hora_inicio_nueva?: string;

  @IsOptional()
  @IsString()
  hora_fin_nueva?: string;

  @IsOptional()
  @IsString()
  doctor_nombre_nuevo?: string;

  @IsOptional()
  @IsString()
  servicio_nombre_nuevo?: string;

  @IsOptional()
  @IsString()
  motivo_cita_nuevo?: string;

  // Payload completo que se aplicará a la cita al aprobar (CrearCitaDto)
  @IsObject()
  payload: Record<string, any>;
}
