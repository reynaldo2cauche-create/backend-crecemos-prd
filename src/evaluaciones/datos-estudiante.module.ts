import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatosEstudiante } from './datos-estudiante.entity';
import { DatosEstudianteService } from './datos-estudiante.service';
import { DatosEstudianteController } from './datos-estudiante.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DatosEstudiante])],
  providers: [DatosEstudianteService],
  controllers: [DatosEstudianteController],
  exports: [DatosEstudianteService]
})
export class DatosEstudianteModule {} 