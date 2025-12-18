import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { TrabajadorCentroController } from './trabajador-centro.controller';
import { Rol } from './rol.entity';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';
import { Especialidad } from './especialidad.entity';
import { EspecialidadService } from './especialidad.service';
import { EspecialidadController } from './especialidad.controller';
import { Cargo } from './cargo.entity';
import { CargoService } from './cargo.service';
import { CargoController } from './cargo.controller';
import { TrabajadorServicio } from './trabajador-servicio.entity';
import { TrabajadorServicioService } from './trabajador-servicio.service';
import { TrabajadorServicioController } from './trabajador-servicio.controller';
import { Servicios } from '../catalogos/servicios.entity';
import { PacienteServicio } from '../pacientes/paciente-servicio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrabajadorCentro, Rol, Especialidad, Cargo, TrabajadorServicio, Servicios, PacienteServicio])],
  providers: [TrabajadorCentroService, RolService, EspecialidadService, CargoService, TrabajadorServicioService],
  controllers: [TrabajadorCentroController, RolController, EspecialidadController, CargoController, TrabajadorServicioController],
  exports: [TrabajadorCentroService, RolService, EspecialidadService, CargoService, TrabajadorServicioService],
})
export class TrabajadorCentroModule {} 