import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Pago } from './pago.entity';
import { Vacacion } from './vacacion.entity';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { TipoSueldo } from './tipo-sueldo.entity';
import { Mes } from './mes.entity';
import { PeriodoGratificacion } from './periodo-gratificacion.entity';
import { TipoFalta } from './tipo-falta.entity';
import { Falta } from './falta.entity';
import { Solicitud } from './solicitud.entity';
import { SolicitudHistorial } from './solicitud-historial.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { VacacionesController } from './vacaciones.controller';
import { VacacionesService } from './vacaciones.service';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrabajadorCentro,
      Pago,
      Vacacion,
      CuentaBancaria,
      TipoSueldo,
      Mes,
      PeriodoGratificacion,
      TipoFalta,
      Falta,
      Solicitud,
      SolicitudHistorial,
    ]),
  ],
  controllers: [PagosController, VacacionesController, CuentasBancariasController, FaltasController, SolicitudesController],
  providers: [PagosService, VacacionesService, CuentasBancariasService, FaltasService, SolicitudesService],
  exports: [PagosService, VacacionesService, CuentasBancariasService, FaltasService, SolicitudesService],
})
export class RrhhModule {}
