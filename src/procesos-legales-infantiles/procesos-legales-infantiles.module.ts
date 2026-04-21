import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesoLegalInfantil } from './entities/proceso-legal-infantil.entity';
import { ProcesosLegalesInfantilesService } from './procesos-legales-infantiles.service';
import { ProcesosLegalesInfantilesController } from './procesos-legales-infantiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProcesoLegalInfantil])],
  controllers: [ProcesosLegalesInfantilesController],
  providers: [ProcesosLegalesInfantilesService],
  exports: [ProcesosLegalesInfantilesService],
})
export class ProcesosLegalesInfantilesModule {}
