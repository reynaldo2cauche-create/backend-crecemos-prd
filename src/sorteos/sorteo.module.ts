import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SorteoController } from './sorteo.controller';
import { SorteoService } from './sorteo.service';
import { CompraController } from './compra.controller';
import { CompraService } from './compra.service';
import { Sorteo } from './entities/sorteo.entity';
import { ReglaSorteo } from './entities/regla-sorteo.entity';
import { SorteoGanador } from './entities/sorteo-ganador.entity';
import { EstadoSorteo } from './entities/estado-sorteo.entity';
import { SorteoParticipante } from './entities/sorteo-participante.entity';
import { Compra } from './entities/compra.entity';
import { TipoCompra } from './entities/tipo-compra.entity';
import { Paquete } from './entities/paquete.entity';
import { Paciente } from '../pacientes/paciente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sorteo,
      ReglaSorteo,
      SorteoGanador,
      EstadoSorteo,
      SorteoParticipante,
      Compra,
      TipoCompra,
      Paquete,
      Paciente,
    ]),
  ],
  controllers: [SorteoController, CompraController],
  providers: [SorteoService, CompraService],
  exports: [SorteoService, CompraService],
})
export class SorteoModule {}
