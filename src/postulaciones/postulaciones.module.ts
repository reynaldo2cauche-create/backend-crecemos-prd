// ========================================
// 1. src/postulaciones/postulaciones.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PostulacionesController } from './postulaciones.controller';
import { PostulacionesService } from './postulaciones.service';
import { Postulacion } from './postulacion.entity';
import { Comentario} from './comentario.entity';
import { TrabajadorCentro } from 'src/evaluaciones/trabajador-centro.entity';
import { CargoPostulacion } from './cargo-postulacion.entity';
import { CargosPostulacionController } from './cargos-postulacion.controller';
import { CargoPostulacionService } from './cargos-postulacion.service';
import { EstadoPostulacion } from './estado-postulacion.entity';
import { EstadosPostulacionController } from './estado-postulacion.controller';
import { EstadoPostulacionService } from './estados-postulacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Postulacion,Comentario,TrabajadorCentro,CargoPostulacion,EstadoPostulacion]),
    MulterModule.register({
      dest: './uploads/cvs',
    }),
  ],
  controllers: [PostulacionesController, CargosPostulacionController,EstadosPostulacionController],
  providers: [PostulacionesService,CargoPostulacionService,EstadoPostulacionService],
  exports: [PostulacionesService,
    CargoPostulacionService,
    EstadoPostulacionService,],
})
export class PostulacionesModule {}
