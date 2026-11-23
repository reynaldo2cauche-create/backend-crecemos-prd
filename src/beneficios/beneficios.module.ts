import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeneficiosConfig } from './entities/beneficios-config.entity';
import { BeneficiosConfigHistorial } from './entities/beneficios-config-historial.entity';
import { PacienteBeneficios } from './entities/paciente-beneficios.entity';
import { PuntosMovimiento } from './entities/puntos-movimiento.entity';
import { Canje } from './entities/canje.entity';
import { Producto } from '../inventario/entities/producto.entity';
import { BeneficiosService } from './beneficios.service';
import { BeneficiosController } from './beneficios.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { BeneficiosPublicoController } from './beneficios-publico.controller';
import { PacienteModule } from 'src/pacientes/paciente.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BeneficiosConfig,
      BeneficiosConfigHistorial,
      PacienteBeneficios,
      PuntosMovimiento,
      Canje,
      Producto,
    ]),
    AuditoriaModule,
    PacienteModule,
  ],
  providers: [BeneficiosService],
  controllers: [BeneficiosController,BeneficiosPublicoController],
  exports: [BeneficiosService],
})
export class BeneficiosModule {}
