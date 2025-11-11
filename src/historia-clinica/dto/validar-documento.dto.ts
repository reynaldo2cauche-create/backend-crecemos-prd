// ============================================
// src/archivos/dto/validar-documento.dto.ts
// ============================================
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ValidarDocumentoDto {
  @IsString()
  @IsNotEmpty({ message: 'El código es requerido' })
  @Matches(/^CTC-[A-Z0-9]{8}$/, { 
    message: 'El código debe tener el formato CTC-XXXXXXXX' 
  })
  codigo: string;
}