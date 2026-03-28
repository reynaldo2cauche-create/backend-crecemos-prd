import { IsInt, IsString, IsBoolean, IsOptional, IsDateString, Min, Max, ValidateIf } from 'class-validator';

export class CreateBloqueoDto {
  @IsInt()
  trabajadorId: number;

  @IsInt()
  tipoBloqueoId: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number;

  @IsBoolean()
  todoElDia: boolean;

  @ValidateIf(o => !o.todoElDia)
  @IsString()
  horaInicio?: string;

  @ValidateIf(o => !o.todoElDia)
  @IsString()
  horaFin?: string;

  @IsString()
  motivo: string;

  @IsOptional()
  @IsInt()
  userIdCrea?: number;
}
