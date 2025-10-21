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

@Module({
  imports: [
    TypeOrmModule.forFeature([Postulacion,Comentario,TrabajadorCentro]),
    MulterModule.register({
      dest: './uploads/cvs',
    }),
  ],
  controllers: [PostulacionesController],
  providers: [PostulacionesService],
  exports: [PostulacionesService],
})
export class PostulacionesModule {}
