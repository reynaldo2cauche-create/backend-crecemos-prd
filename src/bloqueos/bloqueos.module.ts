import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BloqueosController } from './bloqueos.controller';
import { BloqueosService } from './bloqueos.service';
import { BloqueoHorarios } from './entities/bloqueo-horarios.entity';
import { TipoBloqueo } from '../catalogos/tipo-bloqueo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BloqueoHorarios, TipoBloqueo])],
  controllers: [BloqueosController],
  providers: [BloqueosService],
  exports: [BloqueosService],
})
export class BloqueosModule {}
