import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TrabajadorCentro } from './trabajador-centro.entity';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { TrabajadorCentroController } from './trabajador-centro.controller';
import { Rol } from './rol.entity';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';
import { Especialidad } from './especialidad.entity';
import { EspecialidadService } from './especialidad.service';
import { EspecialidadController } from './especialidad.controller';
import { Cargo } from './cargo.entity';
import { CargoService } from './cargo.service';
import { CargoController } from './cargo.controller';
import { TrabajadorServicio } from './trabajador-servicio.entity';
import { TrabajadorServicioService } from './trabajador-servicio.service';
import { TrabajadorServicioController } from './trabajador-servicio.controller';
import { Servicios } from '../catalogos/servicios.entity';
import { PacienteServicio } from '../pacientes/paciente-servicio.entity';
import { DatosAcademicos } from './datos-academicos.entity';
import { NivelEducacion } from '../catalogos/nivel-educacion.entity';
import { Distrito } from '../catalogos/distrito.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrabajadorCentro,
      Rol,
      Especialidad,
      Cargo,
      TrabajadorServicio,
      Servicios,
      PacienteServicio,
      DatosAcademicos,
      NivelEducacion,
      Distrito,
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/trabajadores',
        filename: (req, file, callback) => {
          // Generar nombre único para el archivo
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Permitir solo ciertos tipos de archivos
        const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
          return callback(null, true);
        } else {
          callback(
            new Error('Solo se permiten archivos PDF, DOC, DOCX, JPG, JPEG, PNG'),
            false,
          );
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
      },
    }),
  ],
  providers: [
    TrabajadorCentroService,
    RolService,
    EspecialidadService,
    CargoService,
    TrabajadorServicioService,
  ],
  controllers: [
    TrabajadorCentroController,
    RolController,
    EspecialidadController,
    CargoController,
    TrabajadorServicioController,
  ],
  exports: [
    TrabajadorCentroService,
    RolService,
    EspecialidadService,
    CargoService,
    TrabajadorServicioService,
  ],
})
export class TrabajadorCentroModule {}