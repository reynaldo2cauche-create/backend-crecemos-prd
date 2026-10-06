import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FichaSeguimientoPsicologia } from './ficha-seguimiento-psicologia.entity';
import { FichaSeguimientoPsicologiaController } from './ficha-seguimiento-psicologia.controller';
import { FichaSeguimientoPsicologiaService } from './ficha-seguimiento-psicologia.service';
import { GeofencingModule } from '../geofencing/geofencing.module';

@Module({
  imports: [TypeOrmModule.forFeature([FichaSeguimientoPsicologia]), GeofencingModule],
  controllers: [FichaSeguimientoPsicologiaController],
  providers: [FichaSeguimientoPsicologiaService],
  exports: [FichaSeguimientoPsicologiaService],
})
export class FichaSeguimientoPsicologiaModule {}
