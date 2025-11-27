import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Pago } from './pago.entity';
import { Vacacion } from './vacacion.entity';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { VacacionesController } from './vacaciones.controller';
import { VacacionesService } from './vacaciones.service';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { CuentasBancariasService } from './cuentas-bancarias.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrabajadorCentro, Pago, Vacacion, CuentaBancaria])],
  controllers: [PagosController, VacacionesController, CuentasBancariasController],
  providers: [PagosService, VacacionesService, CuentasBancariasService],
  exports: [PagosService, VacacionesService, CuentasBancariasService],
})
export class RrhhModule {}
