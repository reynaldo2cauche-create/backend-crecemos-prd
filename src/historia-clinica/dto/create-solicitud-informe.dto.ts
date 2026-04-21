// ============================================================
// create-solicitud-informe.dto.ts  (sin cambios, se mantiene)
// ============================================================
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSolicitudInformeDto {
  @ApiProperty() @IsInt() @IsNotEmpty() servicio_id: number;
  @ApiProperty() @IsInt() @IsNotEmpty() venta_servicio_id: number;
  @ApiProperty() @IsInt() @IsNotEmpty() documento_tarifa_id: number;
  @ApiProperty() @IsInt() @IsNotEmpty() especialista_id: number;
  @ApiProperty() @IsString() @IsNotEmpty() fecha_solicitud: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fecha_entrega?: string;
  @ApiProperty() @IsNumber() @Min(0) monto: number;
  @ApiProperty() @IsString() @IsNotEmpty() nro_recibo: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() modalidad_pago_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() estado_pago_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nota?: string;
  @IsOptional() @IsInt() user_crea_id?: number;
}

// ============================================================
// update-solicitud-informe.dto.ts
// ============================================================
import { PartialType } from '@nestjs/mapped-types';

export class UpdateSolicitudInformeDto extends PartialType(CreateSolicitudInformeDto) {
  @IsOptional() @IsInt() user_actua_id?: number;
}

// ============================================================
// subir-archivo.dto.ts  — terapeuta sube el informe
// ============================================================
export class SubirArchivoDto {
  @ApiProperty({ description: 'Ruta/URL del archivo subido' })
  @IsString()
  @IsNotEmpty()
  archivo_url: string;

  @IsOptional() @IsInt() user_actua_id?: number;
}

// ============================================================
// revisar-informe.dto.ts  — jefa aprueba o rechaza
// ============================================================
export class RevisarInformeDto {
  @ApiProperty({ description: '3 = Rechazado, 4 = Aprobado', enum: [3, 4] })
  @IsInt()
  @IsNotEmpty()
  estado_id: number; // 3 = Rechazado, 4 = Aprobado

  @ApiPropertyOptional({ description: 'Comentario (obligatorio si estado_id = 3)' })
  @IsOptional()
  @IsString()
  comentario?: string;

  @IsOptional() @IsInt() revisor_id?: number; // se inyecta desde el token JWT
}

// ============================================================
// marcar-entregado.dto.ts  — admisión marca como Entregado
// ============================================================
export class MarcarEntregadoDto {
  @IsOptional() @IsInt() user_actua_id?: number;
}