import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanTerapeuticoController } from './plan-terapeutico.controller';
import { PlanTerapeuticoService } from './plan-terapeutico.service';
import { PlanTerapeutico } from './entities/plan-terapeutico.entity';
import { PlanObjetivoGeneral } from './entities/plan-objetivo-general.entity';
import { PlanObjetivoEspecifico } from './entities/plan-objetivo-especifico.entity';
import { PlanRegistroSesion } from './entities/plan-registro-sesion.entity';
import { PlanBloqueObjetivo } from './entities/plan-bloque-objetivo.entity';
import { PlanArea } from './entities/plan-area.entity';
import { PlanFrecuencia } from './entities/plan-frecuencia.entity';
import { PlanResultado } from './entities/plan-resultado.entity';
import { PlanEstado } from './entities/plan-estado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanTerapeutico,
      PlanObjetivoGeneral,
      PlanObjetivoEspecifico,
      PlanRegistroSesion,
      PlanBloqueObjetivo,
      PlanArea,
      PlanFrecuencia,
      PlanResultado,
      PlanEstado,
    ]),
  ],
  controllers: [PlanTerapeuticoController],
  providers: [PlanTerapeuticoService],
  exports: [PlanTerapeuticoService],
})
export class PlanTerapeuticoModule {}
