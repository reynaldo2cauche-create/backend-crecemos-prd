import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente } from './paciente.entity';
import { PacienteService } from './paciente.service';
import { PacienteController } from './paciente.controller';
import { PacienteServicio } from './paciente-servicio.entity';
import { PacienteServicioService } from './paciente-servicio.service';
import { PacienteServicioController } from './paciente-servicio.controller';
import { AsignacionTerapeuta } from './asignacion-terapeuta.entity';
import { AsignacionTerapeutaService } from './asignacion-terapeuta.service';
import { AsignacionTerapeutaController } from './asignacion-terapeuta.controller';
import { HistoriaClinica } from './historia-clinica.entity';
import { HistoriaClinicaService } from './historia-clinica.service';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { ComentarioTerapia } from './comentario-terapia.entity';
import { ComentarioTerapiaService } from './comentario-terapia.service';
import { ComentarioTerapiaController } from './comentario-terapia.controller';
import { RecepcionController } from './recepcion.controller';
import { TerapeutaController } from './terapeuta.controller';
import { EstadoPaciente } from './estado-paciente.entity';
import { Servicios } from '../catalogos/servicios.entity';

import { NotaEvolucion } from './entities/nota-evolucion.entity';
import { NotaEvolucionService } from './services/nota-evolucion.service';
import { NotaEvolucionController } from './controllers/nota-evolucion.controller';
import { PacienteResponsableController } from './controllers/paciente-responsable.controller';
import { TransferenciaNotas } from './entities/transferencia-notas.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { ParejaPaciente } from './entities/pareja-paciente.entity';
import { ParejaPacienteService } from './services/pareja-paciente.service';
import { Responsable } from './entities/responsable.entity';
import { ResponsablePaciente } from './entities/responsable-paciente.entity';
import { PacienteResponsableService } from './services/paciente-responsable.service';
import { EstadoPacienteService } from './estado-paciente.service';
import { EstadoPacienteController } from './estado-paciente.controller';
import { ConveniosModule } from 'src/convenios/convenios.module';
import { NotificacionesModule } from 'src/notificaciones/notificaciones.module';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { GeofencingModule } from 'src/geofencing/geofencing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paciente,
      PacienteServicio,
      AsignacionTerapeuta,
      HistoriaClinica,
      ComentarioTerapia,
      EstadoPaciente,
      Servicios,
      NotaEvolucion,
      TransferenciaNotas,
      TrabajadorCentro,
      ParejaPaciente,
      Responsable,
      ResponsablePaciente,
    ]),
    ConveniosModule,
    NotificacionesModule,
    GeofencingModule,
  ],
  providers: [
    PacienteService,
    PacienteServicioService,
    AsignacionTerapeutaService,
    HistoriaClinicaService,
    ComentarioTerapiaService,
    NotaEvolucionService,
    ParejaPacienteService,
    PacienteResponsableService,
    EstadoPacienteService,
  ],
  controllers: [
    PacienteController,
    PacienteServicioController,
    AsignacionTerapeutaController,
    HistoriaClinicaController,
    ComentarioTerapiaController,
    RecepcionController,
    TerapeutaController,
    NotaEvolucionController,
    PacienteResponsableController,
    EstadoPacienteController
  ]
})
export class PacienteModule {}