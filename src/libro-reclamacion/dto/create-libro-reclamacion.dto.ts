import { 
  IsString, 
  IsEmail, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsDateString, 
  IsIn,
  MaxLength,
  MinLength 
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateLibroReclamacionDto {
  // Datos del Consumidor
  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  @IsIn(['DNI', 'CE', 'PASAPORTE', 'RUC'], { message: 'Tipo de documento inválido' })
  tipoDocumento: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es requerido' })
  @MaxLength(20)
  numeroDocumento: string;

  @IsString()
  @IsNotEmpty({ message: 'Los nombres son requeridos' })
  @MaxLength(100)
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  @MaxLength(100)
  apellidos: string;

  @IsString()
  @IsNotEmpty({ message: 'El domicilio es requerido' })
  @MaxLength(255)
  domicilio: string;

  @IsString()
  @IsNotEmpty({ message: 'El departamento es requerido' })
  departamento: string;

  @IsString()
  @IsNotEmpty({ message: 'La provincia es requerida' })
  provincia: string;

  @IsString()
  @IsNotEmpty({ message: 'El distrito es requerido' })
  distrito: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 dígitos' })
  @MaxLength(20)
  telefono: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  // Datos del Bien o Servicio
  @IsString()
  @IsNotEmpty({ message: 'El bien/servicio contratado es requerido' })
  @MaxLength(100)
  bienContratado: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  montoReclamo?: number;

  @IsString()
  @IsNotEmpty({ message: 'El detalle del bien/servicio es requerido' })
  detalleBien: string;

  // Detalle del Reclamo
  @IsString()
  @IsNotEmpty({ message: 'El tipo de reclamo es requerido' })
  @IsIn(['queja', 'reclamo', 'sugerencia'], { message: 'Tipo de reclamo inválido' })
  tipoReclamo: string;

  @IsDateString({}, { message: 'La fecha del hecho debe ser válida' })
  @IsNotEmpty({ message: 'La fecha del hecho es requerida' })
  fechaHecho: string;

  @IsString()
  @IsNotEmpty({ message: 'El lugar del hecho es requerido' })
  @MaxLength(255)
  lugarHecho: string;

  @IsString()
  @IsNotEmpty({ message: 'El detalle del reclamo es requerido' })
  detalleReclamo: string;

  @IsString()
  @IsNotEmpty({ message: 'El pedido del consumidor es requerido' })
  pedidoConsumidor: string;

  // Declaraciones
  @IsBoolean({ message: 'Debe aceptar los términos' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  aceptaTerminos: boolean;

  @IsBoolean({ message: 'Debe autorizar el procesamiento de datos' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  autorizaProcesamiento: boolean;
}