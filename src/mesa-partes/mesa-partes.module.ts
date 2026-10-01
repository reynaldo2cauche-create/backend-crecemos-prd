import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MesaPartesController } from './mesa-partes.controller';
import { MesaPartesService } from './mesa-partes.service';
import { MesaPartesSolicitud } from './entities/solicitud.entity';
import { MesaPartesEvento } from './entities/evento.entity';
import { MesaPartesAdjunto } from './entities/adjunto.entity';
import { MesaPartesEstado } from './entities/estado.entity';
import { MesaPartesTipoEvento } from './entities/tipo-evento.entity';
import { MesaPartesTipo } from './entities/tipo.entity';
import { Paciente } from '../pacientes/paciente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MesaPartesSolicitud,
      MesaPartesEvento,
      MesaPartesAdjunto,
      MesaPartesEstado,
      MesaPartesTipoEvento,
      MesaPartesTipo,
      Paciente,
    ]),
  ],
  controllers: [MesaPartesController],
  providers: [MesaPartesService],
  exports: [MesaPartesService],
})
export class MesaPartesModule {}
