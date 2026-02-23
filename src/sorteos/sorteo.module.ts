import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SorteoController } from './sorteo.controller';
import { SorteoService } from './sorteo.service';

import { Sorteo } from './entities/sorteo.entity';

import { SorteoGanador } from './entities/sorteo-ganador.entity';
import { EstadoSorteo } from './entities/estado-sorteo.entity';
import { SorteoParticipante } from './entities/sorteo-participante.entity';

import { TipoCompra } from './entities/tipo-compra.entity';
import { Paquete } from './entities/paquete.entity';
import { Paciente } from '../pacientes/paciente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sorteo,

      SorteoGanador,
      EstadoSorteo,
      SorteoParticipante,
     
      TipoCompra,
      Paquete,
      Paciente,
    ]),
  ],
  controllers: [SorteoController],
  providers: [SorteoService],
  exports: [SorteoService],
})
export class SorteoModule {}
