import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanificadorController } from './planificador.controller';
import { PlanificadorService } from './planificador.service';
import { PlanificadorBloque } from './entities/planificador-bloque.entity';
import { PlanificadorObjetivo } from './entities/planificador-objetivo.entity';
import { PlanificadorSesion } from './entities/planificador-sesion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanificadorBloque,
      PlanificadorObjetivo,
      PlanificadorSesion,
    ]),
  ],
  controllers: [PlanificadorController],
  providers: [PlanificadorService],
  exports: [PlanificadorService],
})
export class PlanificadorModule {}
